import tkinter as tk
from tkinter import ttk
from enum import Enum
from typing import List, Callable, Any

class DIR(Enum):
    COL = 0
    ROW = 1

class Checkbox():
    bvar:tk.BooleanVar
    cb:ttk.Checkbutton

    def __init__(self, wrapper:tk.Frame, name:str, command:Callable):
        self.bvar = tk.BooleanVar()
        self.bvar.set(False)
        self.cb = ttk.Checkbutton(wrapper, text=name, command=command, variable=self.bvar)

class Checkboxes():
    tk_label:tk.Label
    tk_button:ttk.Checkbutton
    wrapper:tk.Frame
    row = 0
    btn_row = 0
    btn_col:int = 0
    parent:'tk.Frame'
    check_list:List

    def __init__(self, parent:tk.Frame, row:int, label:str, label_width:int=20, sticky="nsew"):
        self.parent = parent
        self.row = row
        self.tk_label = tk.Label(parent, text=label, width=label_width, anchor="w")

        self.wrapper = tk.Frame(parent)
        self.tk_label.grid(column=0, row=row, sticky="w", padx=5)
        self.wrapper.grid(column=1, row=row, sticky=sticky)

        self.check_list = []
        self.btn_col = 0
        self.btn_row = 0

    def add_checkbox(self, name:str, command:Callable, sticky:Any = (tk.N, tk.W), dir:DIR=DIR.COL) -> ttk.Checkbutton:
        cb = Checkbox(self.wrapper, name=name, command=command)
        self.check_list.append(cb)
        cb.cb.grid(column=self.btn_col, row=self.btn_row, sticky=sticky, pady=2, padx=5)
        if dir == DIR.COL:
            self.btn_col += 1
        elif dir == DIR.ROW:
            self.btn_row += 1
        return cb.cb

    def get_next_row(self):
        return self.row + 1 + self.btn_row

