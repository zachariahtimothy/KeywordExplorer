import time

import numpy as np
import openai
import openai.embeddings_utils as oaiu
import pandas as pd
import re
import ast
import pickle

from keyword_explorer.OpenAI.OpenAIComms import OpenAIComms
from keyword_explorer.utils.MySqlInterface import MySqlInterface

from typing import List, Dict, Pattern

class OpenAIEmbeddings:
    oac:OpenAIComms


    def __init__(self):
        print("OpenAIEmbeddings")
        self.oac = OpenAIComms()

    def answer_question(self, question:str, context:str, model="text-davinci-003", max_len=1800,
            size="ada", debug=False, max_tokens=150, stop_sequence=None) -> str:
        """
        Answer a question based on the most similar context from the dataframe texts
        """
        prompt=f"Answer the question based on the context below, and if the question can't be answered based on the context, say \"I don't know\"\n\nContext: {context}\n\n---\n\nQuestion: {question}\nAnswer:"
        result = self.oac.get_prompt_result_params(prompt, max_tokens=max_tokens, temperature=0, top_p=1, frequency_penalty=0, presence_penalty=0, engine=model)
        return result

    def parse_text_file(self, filename:str, min_len:int = 5, r_str:str = r"\n+|[\.!?()“”]+", default_print:int = 0) -> List:
        s_list = []
        reg = re.compile(r_str)
        with open(filename, mode="r", encoding="G-8") as f:
            s = f.read()
            s_list = reg.split(s)
            s_iter = filter(None, s_list)
            s_list = []
            for s in s_iter:
                if len(s) > min_len:
                    s_list.append(s.strip())

            for i in range(default_print):
                print("{}: {}".format(i, s_list[i]))

        return s_list

    def get_embeddings(self, text_list:List, submit_size:int = 10, max:int = -1) -> pd.DataFrame:
        d_list = []
        d:Dict
        num_text = len(text_list)
        # for i in range(0, num_text+submit_size-1, submit_size):
        #    s_list = text_list[i:min(num_text, i+submit_size])
        for i in range(0, num_text, submit_size):
            s_list = text_list[i:i+submit_size]
            percent_done = float(i/num_text) * 100

            result = self.oac.get_embedding_list(s_list, 'text-embedding-ada-002')
            for d in result:
                text = d['text']
                embedding = np.array(d['embedding'])
                d = {"text":text, "embedding":embedding}
                d_list.append(d)
            print("{:2f}%: {}".format(percent_done, s_list[0]))
            if max > 0 and i > max:
                break

        df = pd.DataFrame(d_list)
        return df

    def set_summary_embeddings(self, text_name:str, group_name:str, limit:int = -1, database="gpt_summary", user="root") -> int:
        d:Dict
        msi = MySqlInterface(user, database)

        # Make sure there is a project to use
        sql = "select * from table_source where text_name = %s and group_name = %s"
        vals = (text_name, group_name)
        results = msi.read_data(sql, vals)
        if len(results) == 0:
            print("Unable to find project '{}':'{}'".format(text_name, group_name))
            return -1
        d = results[0]
        project_id = d['id']
        # take some set of lines from the parsed text table and produce summary lines in the summary text table

        sql = 'select id, source, summary_text from table_summary_text where source = %s and embedding is NULL'
        if limit != -1:
            sql = '{} LIMIT {}'.format(sql, limit)
        vals = (project_id, )

        results = msi.read_data(sql, vals)
        text_list = []
        id_list = []
        for d in results:
            text_list.append(d['summary_text'])
            id_list.append(d['id'])

        print("OpenAIEmbeddings.set_summary_embeddings() setting up DataFrame")
        df = self.get_embeddings(text_list)
        df['id'] = id_list
        emb:np.array
        print("OpenAIEmbeddings.set_summary_embeddings() writing to DB")
        for index, row in df.iterrows():
            id = row['id']
            emb = row['embedding']
            # print("[{}], {}".format(id, emb))
            sql = "update table_summary_text set embedding = %s where id = %s"
            vals = (emb.dumps(), id)
            msi.write_sql_values_get_row(sql, vals)

        msi.close()
        print("OpenAIEmbeddings.set_summary_embeddings() Processed {} embeddings".format(len(df.index)))

    def create_context(self, question:str, df:pd.DataFrame, max_len=300, size="ada"):
        """
        Create a context for a question by finding the most similar context from the dataframe
        """
        print("Question: [{}]".format(question))
        # Get the embeddings for the question
        # return openai.Embedding.create(input = [text], model=engine)['data'][0]['embedding']
        #q_embeddings = openai.Embedding.create(input=question, engine='text-embedding-ada-002')['data'][0]['embedding']
        q_embeddings = self.oac.get_embedding(question)

        # Get the distances from the embeddings
        df['distances'] = oaiu.distances_from_embeddings(q_embeddings, list(df['embedding'].values), distance_metric='cosine')


        returns = []
        cur_len = 0
        df2 = df.sort_values('distances', ascending=True)
        # Sort by distance and add the text to the context until the context is too long
        for i, row in df2.iterrows():

            # Add the length of the text to the current length
            text = str(row['parsed_text'])
            words = text.split()
            cur_len += len(words)

            # If the context is too long, break
            if cur_len > max_len:
                break

            # Else add it to the text that is being returned
            # print("row [{}] distance = {} text = [{}]".format(row['row_id'], row['distances'], text))
            # reverse the order of the context
            returns.append(text)

        # Return the context so the best match is closest to the question
        return "\n\n###\n\n".join(returns.reverse())

    def build_text_to_summarize(self, results:List, count:int, words_to_summarize = 200) -> Dict:
        num_lines = len(results)
        d:Dict
        text:str
        query = "Summarize the following into a single sentence:\n"
        row_list = []
        origin_list = []
        word_count = 0
        while word_count < words_to_summarize and count < num_lines:
            #print("count = {}".format(count))
            d = results[count]
            text = d['parsed_text']
            word_count += text.count(" ")
            row_list.append(d['text_id'])
            if 'origins' in d: # this would be from a summary
                l = ast.literal_eval(d['origins'])
                origin_list += l
            else: # this is working on the original text
                origin_list.append(d['text_id'])

            # query = "{} [{}] {}".format(query, d['text_id'], text)
            query = "{} {}.".format(query, text)
            count += 1

        query = "{}\n\nSummary:".format(query)
        d = {'query':query, 'count':count, 'row_list':row_list, 'origins':origin_list}
        return d

    def summarize_raw_text(self, text_name:str, group_name:str, max_lines = -1, words_to_summarize = 200, target_line_count = 10, database="gpt_summary", user="root") -> int:
        # take some set of lines from the parsed text table and produce summary lines in the summary text table
        d:Dict
        msi = MySqlInterface(user, database)
        sql = "select * from table_source where text_name = %s and group_name = %s"
        vals = (text_name, group_name)
        results = msi.read_data(sql, vals)
        if len(results) == 0:
            print("Unable to find project '{}':'{}'".format(text_name, group_name))
            return -1
        d = results[0]
        project_id = d['id']
        # then take those summaries and recursively summarize until the target line count is reached
        sql = "select text_id, parsed_text, from source_text_view where source_id = %s and summary_id IS NULL"
        if max_lines != -1:
            sql = "{} limit {}".format(sql, max_lines)
        vals = (project_id,)
        results = msi.read_data(sql, vals)

        num_lines = len(results)
        count = 0
        level = 1
        summary_count = 0
        while count < num_lines:
            d = self.build_text_to_summarize(results, count, words_to_summarize)
            # run the query and store the result. Update the parsed text table with the summary id
            summary = self.oac.get_prompt_result_params(d['query'], temperature=0, presence_penalty=0.8, frequency_penalty=0, max_tokens=128)
            sql = "insert into table_summary_text (source, level, summary_text, origins) values (%s, %s, %s, %s)"
            vals = (project_id, level, summary, str(d['origins']))
            row_id = msi.write_sql_values_get_row(sql, vals)
            summary_count += 1
            print("[{}] {}".format(row_id, summary))

            for r in d['row_list']:
                sql = "update table_parsed_text set summary_id = %s where id = %s"
                vals = (row_id, r)
                msi.write_sql_values_get_row(sql, vals)
            count = d['count']

        msi.close()
        return summary_count

    def summarize_summary_text(self, text_name:str, group_name:str, source_level:int, max_lines = -1, words_to_summarize = 200, database="gpt_summary", user="root") -> int:
        # take some set of lines from the parsed text table and produce summary lines in the summary text table
        d:Dict
        msi = MySqlInterface(user, database)

        # Make sure there is a project to use
        sql = "select * from table_source where text_name = %s and group_name = %s"
        vals = (text_name, group_name)
        results = msi.read_data(sql, vals)
        if len(results) == 0:
            print("Unable to find project '{}':'{}'".format(text_name, group_name))
            return -1
        d = results[0]
        project_id = d['id']

        # get all the items that are left to summarice in this level
        target_level = source_level +1
        # get all the lines in the source that have not been summarized yet
        sql = "select text_id, parsed_text, origins from summary_text_view where proj_id = %s and level = %s and summary_id = -1"
        vals = (project_id, source_level)
        results = msi.read_data(sql, vals)
        num_lines = len(results)
        print("----------- lines to summarize = {} rows, source_level = {} -----------------".format(num_lines, source_level))

        # build the summary
        count = 0
        while count < num_lines:
            d = self.build_text_to_summarize(results, count, words_to_summarize)
            # run the query and store the result. Update the parsed text table with the summary id
            summary = self.oac.get_prompt_result_params(d['query'], temperature=0, presence_penalty=0.8, frequency_penalty=0, max_tokens=128)
            sql = "insert into table_summary_text (source, level, summary_text, origins) values (%s, %s, %s, %s)"
            vals = (project_id, target_level, summary, str(d['origins']))
            row_id = msi.write_sql_values_get_row(sql, vals)
            print("[{}] - {} - {}".format(row_id, d['row_list'], summary))

            for r in d['row_list']:
                sql = "update table_summary_text set summary_id = %s where id = %s"
                vals = (row_id, r)
                msi.write_sql_values_get_row(sql, vals)
            count = d['count']

        # Figure out how many lines are in the new summary
        sql = "select count(*) from summary_text_view where proj_id = %s and level = %s"
        vals = (project_id, target_level)
        results = msi.read_data(sql, vals)
        num_lines = results[0]['count(*)']

        msi.close()
        return num_lines


    def store_project_data(self, text_name:str, group_name_str, df:pd.DataFrame, database="gpt_summary", user="root"):
        msi = MySqlInterface(user, database)
        sql = "select * from table_source where text_name = %s and group_name = %s"
        vals = (text_name, group_name_str)
        results = msi.read_data(sql, vals)
        if len(results) == 0:
            print("No db entry for '{}' '{}': creating entry")
            sql = "insert into table_source (text_name, group_name) values (%s, %s)"
            source_id = msi.write_sql_values_get_row(sql, vals)
        else:
            source_id = results[0]['id']

        print("source_id = {}".format(source_id))
        for index, row in df.iterrows():
            text = row['text']
            embedding = row['embedding']
            sql = "insert into gpt_summary.table_parsed_text (source, parsed_text, embedding) values (%s, %s, %s)"
            vals = (source_id, text, embedding.dumps())
            msi.write_sql_values_get_row(sql, vals)

        msi.close()

    def load_project_data(self, text_name:str, group_name:str, database="gpt_summary", user="root", limit = -1) -> pd.DataFrame:
        msi = MySqlInterface(user, database, enable_writes = False)
        sql = "select * from table_source where text_name = %s and group_name = %s"
        vals = (text_name, group_name)
        results = msi.read_data(sql, vals)
        if len(results) == 0:
            print("No db entry for '{}' '{}': creating entry")
            return pd.DataFrame() # Return an empty DataFrame
        else:
            source_id = results[0]['id']

        print("OpenAIEmbeddings.load_project_data(): pulling text for '{}'".format(text_name))
        sql = "select id as row_id, parsed_text, embedding from gpt_summary.table_parsed_text where source = {}".format(source_id)
        if limit > 0:
            sql += " limit {}".format(limit)

        results = msi.read_data(sql)

        msi.close()

        print("\tProcessing {} lines".format(len(results)))
        d:Dict
        for d in results:
            emb = d['embedding']
            d['embedding'] = pickle.loads(emb)
            # print(d)

        df = pd.DataFrame(results)
        print("\tDone")
        return df


    def write_csv(self, filename:str, df:pd.DataFrame):
        df.to_csv(filename)

    def read_csv(self, filename:str) -> pd.DataFrame:
        print("OpenAIEmbeddings.read_csv(): reading {}".format(filename))
        df = pd.read_csv(filename, index_col=0)
        print("\tconverting")
        d = df.to_dict()
        de = d['embedding']
        for key, val in de.items():
            l = ast.literal_eval(val)
            de[key] = l
        df = pd.DataFrame(d)
        print("\tready")
        return df

def create_csv_main():
    oae = OpenAIEmbeddings()
    s_list = oae.parse_text_file("../../corpora/moby-dick-3.txt", 10, default_print=100) # can be obtained here: https://www.gutenberg.org/files/2701/2701-h/2701-h.htm
    df = oae.get_embeddings(s_list)
    print(df)
    df.to_csv("../../data/moby-dick-embeddings_3.csv")
    print("done writing file")

def store_embeddings_main():
    oae = OpenAIEmbeddings()
    s_list = oae.parse_text_file("../../corpora/moby-dick.txt", 10, default_print=10) # can be obtained here: https://www.gutenberg.org/files/2701/2701-h/2701-h.htm
    # df = oae.get_embeddings(s_list[:100])
    df = oae.get_embeddings(s_list)
    print(df)
    oae.store_project_data("moby-dick", "melville", df)

def load_data_main():
    oae = OpenAIEmbeddings()
    df = oae.load_project_data("moby-dick", "melville", limit=1000)
    question = "what are best ways to hunt whales"
    cs = oae.create_context(question, df)
    print("Context string:\n{}".format(cs))

def summarize_project_main(min_rows = 10):
    oae = OpenAIEmbeddings()
    # num_rows = oae.summarize_raw_text("moby-dick", "melville")
    # while num_rows > min_rows:
    #   num_rows = oae.summarize_summary_text("moby-dick", "melville", source_level=4)
    #   print("summarize_project_main() num_rows = {}".format(num_rows))
    oae.set_summary_embeddings("moby-dick", "melville")

def ask_question_main():
    oae = OpenAIEmbeddings()
    df = oae.load_project_data("moby-dick", "melville")
    question = "What's the best way to hunt whales using space ships and ray guns?"
    cs = oae.create_context(question, df)
    # print("Context string:\n{}".format(cs))
    answer = oae.answer_question(question=question, context=cs)
    print("\nAnswer:\n{}".format(answer))

    top_texts = 5
    print("Supporting top {} text:".format(top_texts))
    count = 0
    for index, row in df.sort_values('distances', ascending=True).iterrows():
        print("\trow [{}] distance = {} text = [{}]".format(row['row_id'], row['distances'], row['parsed_text']))
        if count > top_texts:
            break
        count += 1

def fix_summary_origins():
    d:Dict
    d2:Dict
    msi = MySqlInterface("root", "gpt_summary", enable_writes = True)
    sql = "select distinct summary_id from table_summary_text"
    results = msi.read_data(sql)

    for d in results:
        summary_id = d['summary_id']
        sql = "select id, origins from table_summary_text where summary_id = %s and summary_id > 0"
        vals = (summary_id,)
        full_list = []
        results2 = msi.read_data(sql, vals)
        for d2 in results2:
            l = ast.literal_eval(d2['origins'])
            full_list += l
            # print("\t[{}]: {}".format(d2['id'],l))
        print("[{}]: {}".format(summary_id, full_list))
        sql = "update table_summary_text set origins = %s where id = %s"
        vals = (str(full_list), summary_id)
        msi.write_sql_values_get_row(sql, vals)

    msi.close()

if __name__ == "__main__":
    start_time = time.time()
    # create_csv_main()
    # store_embeddings_main()
    # load_data_main()
    #ask_question_main()
    # summarize_project_main()
    fix_summary_origins()
    print("execution took {:.3f} seconds".format(time.time() - start_time))