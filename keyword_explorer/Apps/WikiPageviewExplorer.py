import tkinter as tk
from tkinter import ttk
import tkinter.messagebox as message
from tkinter import filedialog
import inspect
import re
import getpass
from datetime import datetime, timedelta
import pandas as pd
import keyword_explorer.utils.wikipedia_search as ws
from typing import List, Any, Union, Dict


from keyword_explorer.tkUtils.TextField import TextField
from keyword_explorer.tkUtils.Buttons import Buttons
from keyword_explorer.tkUtils.ConsoleDprint import ConsoleDprint
from keyword_explorer.tkUtils.DateEntryField import DateEntryField
from keyword_explorer.tkUtils.DataField import DataField
from keyword_explorer.tkUtils.ListField import ListField

class WikiPageviewExplorer(tk.Tk):
    main_console:tk.Text
    dp:ConsoleDprint
    topic_text_field:TextField
    response_text_field:TextField
    wiki_pages_text_field:TextField
    start_date_field:DateEntryField
    end_date_field:DateEntryField
    experiment_field:DataField
    sample_list:ListField

    def __init__(self, *args, **kwargs):
        super().__init__(*args, **kwargs)
        print("WikiPageviewExplorer")
        self.dp = ConsoleDprint()

        self.title("Keyword WikiPageviewExplorer (v 2.17.22)")
        self.geometry("850x650")
        self.resizable(width=True, height=False)
        self.build_view()

    def build_view(self):
        print("build_view")
        main_text_width = 53
        main_label_width = 15
        param_text_width = 15
        param_label_width = 15

        self.experiment_field = DataField(self, 0, "Experiment name:", 40, label_width=20)
        self.experiment_field.set_text(getpass.getuser())

        lf = tk.LabelFrame(self, text="Topic Search")
        lf.grid(row=1, column=0, columnspan = 2, sticky="nsew", padx=5, pady=2)
        self.build_topic_search(lf, main_text_width, main_label_width)

        lf = tk.LabelFrame(self, text="Page Views")
        lf.grid(row=2, column=0, columnspan = 2, sticky="nsew", padx=5, pady=2)
        self.build_page_views(lf, main_text_width, main_label_width)

        lf = tk.LabelFrame(self, text="Page View Params")
        lf.grid(row=2, column=2, columnspan = 2, sticky="nsew", padx=5, pady=2)
        self.build_page_view_params(lf, param_text_width, param_label_width)

        self.dp.create_tk_console(self, row=3, height=5, char_width=main_text_width+main_label_width, set_console=True)
        self.dp.dprint("build_view()")
        self.end_date_field.set_date()
        self.start_date_field.set_date(d = (datetime.utcnow() - timedelta(days=10)))

    def build_topic_search(self, lf:tk.LabelFrame, text_width:int, label_width:int):
        row = 0
        self.topic_text_field = TextField(lf, row, "Topic", text_width, height=5, label_width=label_width)
        self.topic_text_field.set_text("simpson characters")
        row = self.topic_text_field.get_next_row()
        self.response_text_field = TextField(lf, row, 'Response', text_width, height=10, label_width=label_width)
        row = self.response_text_field.get_next_row()
        buttons = Buttons(lf, row, "Actions", label_width=label_width)
        buttons.add_button("Search", self.implement_me)
        buttons.add_button("Copy Selected", self.implement_me)
        row = buttons.get_next_row()

    def build_page_views(self, lf:tk.LabelFrame, text_width:int, label_width:int):
        row = 0
        self.wiki_pages_text_field = TextField(lf, row, 'Pages', text_width, height=1, label_width=label_width)
        row = self.wiki_pages_text_field.get_next_row()
        self.start_date_field = DateEntryField(lf, row, 'Start Date', text_width, label_width=label_width)
        row = self.start_date_field.get_next_row()
        self.end_date_field = DateEntryField(lf, row, 'End Date', text_width, label_width=label_width)
        row = self.end_date_field.get_next_row()
        buttons = Buttons(lf, row, "Actions", label_width=label_width)
        buttons.add_button("Clear", self.implement_me)
        buttons.add_button("Test Pages", self.implement_me)
        buttons.add_button("Plot", self.implement_me)
        buttons.add_button("Save", self.implement_me)
        row = buttons.get_next_row()

    def build_page_view_params(self, lf:tk.LabelFrame, text_width:int, label_width:int):
        row = 0
        self.sample_list = ListField(lf, row, "Sample", width=text_width, label_width=label_width, static_list=True)
        self.sample_list.set_text(text='daily, weekly, monthly')
        self.sample_list.set_callback(self.set_time_sample_callback)
        self.set_time_sample_callback()
        row = self.sample_list.get_next_row()

    def set_time_sample_callback(self, event:tk.Event = None):
        sample_str = self.sample_list.get_selected()
        self.sample_list.set_label("Sample\n({})".format(sample_str))

    def get_description_df(self, probe:str, response:str) -> pd.DataFrame:
        now = datetime.now()
        now_str = now.strftime("%B_%d_%Y_(%H:%M:%S)")
        sample_str = self.sample_list.get_selected()

        description_dict = {'name':getpass.getuser(), 'date':now_str, 'probe':probe, 'response':response, 'sampling':sample_str}
        df = pd.DataFrame.from_dict(description_dict, orient='index', columns=['Value'])
        return df

    def terminate(self):
        """
        The callback called when clicking the exit button
        :return:
        """
        print("terminating")
        self.destroy()

    def implement_me(self, event:tk.Event = None):
        """
        A callback to point to when you you don't have a method ready. Prints "implement me!" to the output and
        an abbreviated version of the call stack to the console
        :return:
        """
        #self.dprint("Implement me!")
        self.dp.dprint("Implement me! (see console for call stack)")
        fi:inspect.FrameInfo
        count = 0
        self.dp.dprint("\nImplement me!")
        for fi in inspect.stack():
            filename = re.split(r"(/)|(\\)", fi.filename)
            print("Call stack[{}] = {}() (line {} in {})".format(count, fi.function, fi.lineno, filename[-1]))

def main():
    app = WikiPageviewExplorer()
    app.mainloop()

if __name__ == "__main__":
    main()