from transformers import TFGPT2LMHeadModel, GPT2Tokenizer
import tensorflow as tf
import tkinter.messagebox as message
import re

from typing import Union, Dict, List, Pattern

class HFaceGPT:
    tf_seed:int
    tokenizer:Union[None, GPT2Tokenizer]
    model:Union[None, TFGPT2LMHeadModel]
    sequence_regex = re.compile(r"\]\]\[\[")
    element_regex = re.compile(r"\|\| \w+: ")
    word_regex = re.compile(r"\w+")

    def __init__(self, path:str, initial_prompt:str = "]][[text:", seed:int = 2):
        self.tf_seed = seed
        self.tokenizer = GPT2Tokenizer.from_pretrained(path)
        self.model = TFGPT2LMHeadModel.from_pretrained(path, pad_token_id=self.tokenizer.eos_token_id, from_pt=True)
        result_list = self.run_probes(initial_prompt)
        print("initial prompt = {}".format(initial_prompt))
        for result in result_list:
            print("\t{}".format(result))

    def run_probes(self, probe:str, num_return_sequences:int = 10) -> Union[List, None]:
        if self.model == None or self.tokenizer == None:
            message.showwarning("GPT Model", "Model directory unset")
            return None

        tf.random.set_seed(self.tf_seed)
        strings_list = []
        # encode context the generation is conditioned on
        input_ids = self.tokenizer.encode(probe, return_tensors='tf')

        # generate text until the output length (which includes the context length) reaches 50
        output_list  = self.model.generate(
            input_ids,
            do_sample=True,
            max_length=256,
            top_k=50,
            top_p=0.95,
            num_return_sequences=num_return_sequences)

        print("\n{}:".format(probe))
        parse_list = []
        for i, beam_output  in enumerate(output_list):
            output = self.tokenizer.decode(beam_output , skip_special_tokens=True)
            s = " ".join(output.split())
            # s = s.split(']]] [[[')[0]
            # print("\t[{}]: {}".format(i, s))
            parse_list.append(s)
            strings_list.append(s)

        return strings_list

    def parse_sequence(self, s:str) -> List:
        result = self.element_regex.findall(s)
        tag:str
        sequence_list = []
        for i in range(len(result)):
            tag = result[i]
            pos = s.find(tag)
            words = self.word_regex.findall(tag)
            #print("\t[{}] '{}' pos = {}, word = {}".format(i, tag, pos, words[0]))
            sequence_list.append({"tag":tag, "start":pos, "end":pos+len(tag), "word":words[0]})


        for i in range(len(sequence_list)-1):
            d1 = sequence_list[i]
            d2 = sequence_list[i+1]
            substr = s[d1['end']:d2['start']]
            d1['substr'] = substr.strip()
        d = sequence_list[-1]
        d['substr'] = s[d['end']:].strip()

        return sequence_list