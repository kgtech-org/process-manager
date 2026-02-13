import pandas as pd
import os

file_path = 'resources/MACRO PROCESSUS NETWORKS & IS (MAJ).xlsx'

try:
    xl = pd.ExcelFile(file_path)
    print("Sheet names:", xl.sheet_names)
    
    for sheet in xl.sheet_names:
        print(f"\n--- Sheet: {sheet} ---")
        df = xl.parse(sheet, nrows=5)
        print(df.columns.tolist())
        print(df.head())
except Exception as e:
    print(f"Error: {e}")
