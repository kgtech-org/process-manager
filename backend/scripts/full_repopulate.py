import pymongo
import os
import sys

# Add current directory to path to allow import
sys.path.append(os.path.dirname(os.path.abspath(__file__)))

from import_excel_data import import_data

MONGO_URI = 'mongodb://kodesonik:Forzaa12@localhost:27017/process_manager?authSource=admin'
DB_NAME = 'process_manager'

def full_repopulate():
    print("Starting Full Repopulation...")
    
    try:
        client = pymongo.MongoClient(MONGO_URI)
        db = client[DB_NAME]
        print(f"Connected to MongoDB: {DB_NAME}")
        
        # 1. Clear Collections
        collections_to_clear = ['macros', 'documents', 'job_positions', 'departments']
        for col_name in collections_to_clear:
            res = db[col_name].delete_many({})
            print(f"Cleared {res.deleted_count} documents from '{col_name}' collection.")
            
        # 2. Run Import
        print("\nRunning Import...")
        import_data()
        
        print("\nFull Repopulation Complete!")
        
    except Exception as e:
        print(f"Error during repopulation: {e}")
        exit(1)

if __name__ == "__main__":
    full_repopulate()
