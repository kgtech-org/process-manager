import pymongo
import os

try:
    client = pymongo.MongoClient('mongodb://kodesonik:Forzaa12@localhost:27017/process_manager?authSource=admin')
    db = client['process_manager']
    
    # Update all draft documents to Approved status
    # This makes them visible to all users with the new middleware logic
    res = db['documents'].update_many(
        {'status': 'draft'},
        {'$set': {'status': 'approved'}}
    )
    print(f"Updated {res.modified_count} documents from Draft to Approved")
    
except Exception as e:
    print(f"Error: {e}")
