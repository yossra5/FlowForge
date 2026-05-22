import os
from pymongo import MongoClient
from datetime import datetime, timedelta

class MongoDBClient:
    def __init__(self):
        uri = os.environ.get("MONGO_URI", "mongodb://localhost:27017/flowforge")
        self.client = MongoClient(uri)
        self.db = self.client.get_database("flowforge")
        self.collection = self.db["variableusages"]

    def get_training_data(self, days_back=90):
        cutoff = datetime.now() - timedelta(days=days_back)
        cursor = self.collection.find({"timestamp": {"$gte": cutoff}})
        data = []
        for doc in cursor:
            data.append({
                "node_type": doc.get("node_type", "unknown"),
                "field_name": doc.get("field_name", "unknown"),
                "user_input": doc.get("user_input", ""),
                "selected_variable": doc.get("selected_variable", ""),
                "context_vars": doc.get("context_variables", []),
            })
        return data

    def get_stats(self):
        return {"total": self.collection.count_documents({})}