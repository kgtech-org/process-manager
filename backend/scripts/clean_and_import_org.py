import pandas as pd
import pymongo
from datetime import datetime
import re
import os

# Configuration
EXCEL_FILE = 'resources/MACRO PROCESSUS NETWORKS & IS (MAJ).xlsx'
MONGO_URI = 'mongodb://kodesonik:Forzaa12@localhost:27017/process_manager?authSource=admin'
DB_NAME = 'process_manager'

# Connect to MongoDB
try:
    client = pymongo.MongoClient(MONGO_URI)
    db = client[DB_NAME]
    print(f"Connected to MongoDB: {DB_NAME}")
except Exception as e:
    print(f"Error connecting to MongoDB: {e}")
    exit(1)

# Collections
departments_col = db['departments']
job_positions_col = db['job_positions']

def clean_and_import():
    # 1. Clean Old Data
    print("Cleaning old Job Positions and Departments...")
    
    # Check if we should delete EVERYTHING or just what's in the excel?
    # User said "clean alod job positions and departments". Usually implies a wipe of reference data.
    # However, if Users are linked to these, we might break things.
    # But usually for a fresh import/cleanup task, we assume it's desired.
    # SAFEGUARD: Maybe checking if any users are linked?
    #For now, let's just delete as requested.
    
    jp_result = job_positions_col.delete_many({})
    print(f"Deleted {jp_result.deleted_count} Job Positions.")
    
    dept_result = departments_col.delete_many({})
    print(f"Deleted {dept_result.deleted_count} Departments.")
    
    # 2. Import New Data
    # We can reuse the logic from import_excel_data.py but focused on extraction
    import_data()

def clean_text(text):
    if pd.isna(text):
        return ""
    return str(text).strip()

def import_data():
    if not os.path.exists(EXCEL_FILE):
        print(f"File not found: {EXCEL_FILE}")
        return

    xl = pd.ExcelFile(EXCEL_FILE)
    sheet_names = xl.sheet_names
    
    print(f"Found {len(sheet_names)} sheets to process for Departments/Job Positions.")
    
    for sheet_name in sheet_names:
        # print(f"Processing Sheet: {sheet_name}")
        df = xl.parse(sheet_name, header=None)
        
        # Determine header row (same logic as original script)
        header_row_idx = -1
        for i in range(10): 
            row_values = [str(x).lower() for x in df.iloc[i].values]
            if any("process" in x for x in row_values) and any("tâches" in x for x in row_values):
                header_row_idx = i
                break
        
        if header_row_idx == -1:
            continue
            
        # Get columns
        headers = df.iloc[header_row_idx]
        col_map = {}
        for idx, val in enumerate(headers):
            val_str = str(val).lower().strip()
            if "concernées" in val_str or "directions" in val_str:
                col_map['directions'] = idx
                
        if 'directions' not in col_map: 
             # Try absolute index 4
             if df.shape[1] > 4: col_map['directions'] = 4
             else: continue

        # Iterate Data Rows
        for i in range(header_row_idx + 1, df.shape[0]):
            row = df.iloc[i]
            try:
                if col_map['directions'] >= df.shape[1]: 
                    d_content = ""
                else: 
                    d_content = clean_text(row[col_map['directions']])
            except:
                continue
                
            if d_content:
                parts = re.split(r'[\n,]', d_content)
                for part in parts:
                    dir_name = part.strip()
                    if len(dir_name) > 1:
                         # Generate Unique Code
                         base_code = dir_name[:3].upper()
                         if len(dir_name.split()) > 1:
                             base_code = "".join([w[0] for w in dir_name.split() if w])[:4].upper()
                         
                         candidate_code = base_code
                         counter = 1
                         while True:
                             existing = departments_col.find_one({'code': candidate_code})
                             if not existing or existing['name'] == dir_name:
                                 break
                             candidate_code = f"{base_code}{counter}"
                             counter += 1
                         
                         # Department
                         departments_col.update_one(
                             {'name': dir_name},
                             {'$setOnInsert': {
                                 'code': candidate_code,
                                 'active': True,
                                 'created_at': datetime.now(),
                                 'updated_at': datetime.now()
                             }},
                             upsert=True
                         )
                         dept = departments_col.find_one({'name': dir_name})
                         
                         # Job Position
                         job_positions_col.update_one(
                             {'title': dir_name, 'department_id': dept['_id']},
                             {'$setOnInsert': {
                                 'code': candidate_code + "-H",
                                 'active': True,
                                 'created_at': datetime.now(),
                                 'updated_at': datetime.now()
                             }},
                             upsert=True
                         )

    print("Data population complete.")

if __name__ == "__main__":
    clean_and_import()
