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
macros_col = db['macros']
departments_col = db['departments']
job_positions_col = db['job_positions']
documents_col = db['documents']
users_col = db['users'] # To check for existing users if needed, or assign a default user

# Helper to generate ID (ObjectId is handled by pymongo, but we might need string IDs for linking)
# In pymongo, inserting a dict returns an InsertOneResult with inserted_id

def clean_text(text):
    if pd.isna(text):
        return ""
    return str(text).strip()

def get_or_create_admin_user():
    # Find an admin user to be the creator
    admin = users_col.find_one({'email': 'admin@k-j.store'})
    if not admin:
        # Create a dummy admin if not exists (for script purposes, ideally should exist)
        # For now, let's try to find ANY user or create a placeholder ObjectId
        admin = users_col.find_one()
        
    if admin:
        return admin['_id']
    
    # If DB is empty, generate a new ObjectId
    from bson.objectid import ObjectId
    return ObjectId()

CREATED_BY_ID = get_or_create_admin_user()

def import_data():
    if not os.path.exists(EXCEL_FILE):
        print(f"File not found: {EXCEL_FILE}")
        return

    xl = pd.ExcelFile(EXCEL_FILE)
    sheet_names = xl.sheet_names
    
    print(f"Found {len(sheet_names)} sheets (Macros).")
    
    total_processes = 0
    total_tasks = 0

    for sheet_name in sheet_names:
        print(f"\nProcessing Macro: {sheet_name}")
        
        # Parse Sheet
        # Skip the first row usually if it's just title, but let's look at structure
        # Based on inspection:
        # Row 0: Macro Title (e.g. "Macro 01: ...")
        # Row 2: Headers ["Description Détaillée", "Process", "Description du process", "Identification des tâches", "Directions concernées"]
        
        df = xl.parse(sheet_name, header=None)
        
        # Log raw data shape
        # print(f"Shape: {df.shape}")

        # Extract Macro Info from first few rows
        macro_text = clean_text(df.iloc[0, 0]) # e.g. "Macro 01: Stratégie..."
        
        # Try to extract code and name
        # Pattern: "Macro XX: Name"
        match = re.search(r'(Macro\s*\d+)\s*[:|-]\s*(.*)', macro_text, re.IGNORECASE)
        if match:
            macro_code = match.group(1).replace(" ", "")
            macro_name = match.group(2).strip()
        else:
            # Fallback
            macro_code = sheet_name[:10].replace(" ", "")
            macro_name = sheet_name
        
        # Description is usually in row 2 or 3, col 0? 
        # Inspection showed Row 3, Col 0 has "Cette macro couvre..."
        macro_desc = ""
        if df.shape[0] > 3:
             macro_desc = clean_text(df.iloc[3, 0])

        # Create/Update Macro
        macro_doc = {
            'code': macro_code,
            'name': macro_name,
            'short_description': macro_desc[:100] + "..." if len(macro_desc) > 100 else macro_desc,
            'description': macro_desc,
            'created_by': CREATED_BY_ID,
            'created_at': datetime.now(),
            'updated_at': datetime.now()
        }
        
        # Upsert Macro
        res = macros_col.update_one(
            {'code': macro_code},
            {'$set': macro_doc},
            upsert=True
        )
        
        # Get Macro ID
        macro_record = macros_col.find_one({'code': macro_code})
        macro_id = macro_record['_id']

        # Determine header row
        # We look for "Process" or "Identification des tâches"
        header_row_idx = -1
        for i in range(10): # Check first 10 rows
            row_values = [str(x).lower() for x in df.iloc[i].values]
            if any("process" in x for x in row_values) and any("tâches" in x for x in row_values):
                header_row_idx = i
                break
        
        if header_row_idx == -1:
            print(f"  Warning: Could not find header row for {sheet_name}. Skipping details.")
            continue
            
        # Get columns
        headers = df.iloc[header_row_idx]
        # Map headers to column indices
        col_map = {}
        for idx, val in enumerate(headers):
            val_str = str(val).lower().strip()
            if "process" in val_str and "description" not in val_str and len(val_str) < 20: # "Process" column
                col_map['process_title'] = idx
            elif "description" in val_str and "process" in val_str:
                col_map['process_desc'] = idx
            elif "tâches" in val_str:
                col_map['tasks'] = idx
            elif "concernées" in val_str or "directions" in val_str:
                col_map['directions'] = idx

        # If we can't find critical columns, assume standard positions if possible, or skip
        # Standard based on inspection:
        # Col 0: Macro Desc (merged usually)
        # Col 1: Process Name ??? No, inspection showed:
        # Sheet "Sécurité & Résilience SI": ['Description Détaillée', 'Process', 'Description du process', 'Identification des tâches', 'Directions concernées']
        # This matches indices 0, 1, 2, 3, 4
        
        if 'process_title' not in col_map: col_map['process_title'] = 1
        if 'process_desc' not in col_map: col_map['process_desc'] = 2
        if 'tasks' not in col_map: col_map['tasks'] = 3
        if 'directions' not in col_map: col_map['directions'] = 4

        # Iterate Data Rows
        current_process_title = None
        current_process_doc = None
        current_tasks = []
        process_count = 0
        task_count = 0
        
        # Start after header
        for i in range(header_row_idx + 1, df.shape[0]):
            row = df.iloc[i]
            
            try:
                # Check bounds
                if col_map['process_title'] >= df.shape[1]: p_title = ""
                else: p_title = clean_text(row[col_map['process_title']])
                
                if col_map['process_desc'] >= df.shape[1]: p_desc = ""
                else: p_desc = clean_text(row[col_map['process_desc']])
                
                if col_map['tasks'] >= df.shape[1]: t_content = ""
                else: t_content = clean_text(row[col_map['tasks']])
                
                if col_map['directions'] >= df.shape[1]: d_content = ""
                else: d_content = clean_text(row[col_map['directions']])
            except Exception as e:
                print(f"Error reading row {i}: {e}")
                continue
            
            # Identify if this is a new process or continuation
            # Often Process Title is merged cells, so it appears once then NaNs
            # BUT in pandas, if not specified, it might be NaN.
            # We assume if p_title is present and distinct, it's a new process.
            
            if p_title and p_title != current_process_title:
                # Save previous process if exists
                if current_process_doc:
                    # Update tasks
                    documents_col.update_one(
                        {'_id': current_process_doc['_id']},
                        {'$set': {'tasks': current_tasks}}
                    )
                    task_count += len(current_tasks)

                # Start New Process
                current_process_title = p_title
                process_count += 1
                total_processes += 1
                current_tasks = [] # Reset tasks
                
                # Process Directions -> Stakeholders/Dept/JobPos
                stakeholders = []
                if d_content:
                    # Split by newline or comma
                    parts = re.split(r'[\n,]', d_content)
                    for part in parts:
                        dir_name = part.strip()
                        if len(dir_name) > 1: # Ignore empty
                             # Generate Unique Code
                             base_code = dir_name[:3].upper()
                             if len(dir_name.split()) > 1:
                                 # Try initials: Direction Network Engineering -> DNE
                                 base_code = "".join([w[0] for w in dir_name.split() if w])[:4].upper()
                             
                             candidate_code = base_code
                             counter = 1
                             while True:
                                 # Check if code exists for a DIFFERENT department
                                 existing = db['departments'].find_one({'code': candidate_code})
                                 if not existing or existing['name'] == dir_name:
                                     break
                                 candidate_code = f"{base_code}{counter}"
                                 counter += 1
                             
                             # Department
                             db['departments'].update_one(
                                 {'name': dir_name},
                                 {'$setOnInsert': {
                                     'code': candidate_code,
                                     'active': True,
                                     'created_at': datetime.now(),
                                     'updated_at': datetime.now()
                                 }},
                                 upsert=True
                             )
                             dept = db['departments'].find_one({'name': dir_name})
                             
                             # Job Position (Same name as dept for now as per request)
                             db['job_positions'].update_one(
                                 {'title': dir_name, 'department_id': dept['_id']},
                                 {'$setOnInsert': {
                                     'code': candidate_code + "-H", # Head?
                                     'active': True,
                                     'created_at': datetime.now(),
                                     'updated_at': datetime.now()
                                 }},
                                 upsert=True
                             )
                             
                             stakeholders.append(dir_name)

                # Process Code
                # Assume M1_P1 format
                # We need to query count of existing processes for this macro to generate specific code if not in excel
                # For simplicity, we use a temporary index or handle later. 
                # Let's try to extract from title if it has "Proces 1.1" etc, otherwise generate
                process_ref = f"{macro_code}_P{process_count}"
                
                doc_data = {
                    'macro_id': macro_id,
                    'process_code': process_ref,
                    'title': p_title,
                    'description': p_desc,
                    'stakeholders': stakeholders,
                    'tasks': [], # Will fill later
                    'status': 'draft',
                    'version': '1.0',
                    'is_active': True,
                    'created_by': CREATED_BY_ID,
                    'created_at': datetime.now(),
                    'updated_at': datetime.now(),
                    
                    # Required fields from model to avoid validation errors if strictly checked
                    'contributors': {
                        'authors': [],
                        'verifiers': [],
                        'validators': []
                    },
                    'metadata': {
                        'objectives': [],
                        'implicated_actors': stakeholders,
                        'management_rules': [],
                        'terminology': [],
                         'change_history': []
                    }
                }
                
                # Upsert Document
                # Match by Title and Macro
                documents_col.update_one(
                    {'title': p_title, 'macro_id': macro_id},
                    {'$set': doc_data},
                    upsert=True
                )
                current_process_doc = documents_col.find_one({'title': p_title, 'macro_id': macro_id})

            # Process Tasks
            # Even if Process Title is NaN (merged cell continuation), we might have tasks
            if t_content:
                # One cell might contain multiple tasks or just one
                # Usually one row = one task in these formats, but sometimes multiline
                # Let's clean and add
                
                # Check for existing task in current_tasks to avoid dupes if strictly row-based
                # But here we just append.
                
                # Generate Task Code
                t_code = f"{current_process_doc['process_code']}_T{len(current_tasks) + 1}"
                
                task_obj = {
                    'code': t_code,
                    'description': t_content,
                    'order': len(current_tasks) + 1
                }
                current_tasks.append(task_obj)
        
        # Save last process tasks
        if current_process_doc:
             documents_col.update_one(
                    {'_id': current_process_doc['_id']},
                    {'$set': {'tasks': current_tasks}}
             )
             task_count += len(current_tasks)
             total_tasks += task_count

        print(f"  -> Created/Updated {process_count} processes with {task_count} tasks.")
    
    print("\n--- Import Summary ---")
    print(f"Total Macros: {len(sheet_names)}")
    print(f"Total Processes: {total_processes}")
    print(f"Total Tasks: {total_tasks}")
    print("----------------------")

if __name__ == "__main__":
    import_data()
