# ml-service/src/collector.py
# Collects training data from FlowForge user interactions

import json
import os
from datetime import datetime

class DataCollector:
    def __init__(self, data_path="data/raw/interactions.json"):
        self.data_path = data_path
        self.interactions = self._load()
    
    def _load(self):
        os.makedirs(os.path.dirname(self.data_path), exist_ok=True)
        if os.path.exists(self.data_path):
            with open(self.data_path, 'r') as f:
                return json.load(f)
        return []
    
    def _save(self):
        with open(self.data_path, 'w') as f:
            json.dump(self.interactions, f, indent=2)
    
    def log_selection(self, node_type, field_name, context_vars, selected_variable, user_input, workflow_id):
        """Log when a user selects a suggestion"""
        entry = {
            "timestamp": datetime.now().isoformat(),
            "workflow_id": workflow_id,
            "node_type": node_type,
            "field_name": field_name,
            "context_vars": context_vars,
            "selected_variable": selected_variable,
            "user_input": user_input,
            "type": "selection"
        }
        self.interactions.append(entry)
        self._save()
    
    def get_training_data(self):
        """Convert interactions to training format"""
        training = []
        for interaction in self.interactions:
            training.append({
                "node_type": interaction["node_type"],
                "field_name": interaction["field_name"],
                "context_vars": interaction["context_vars"],
                "selected_variable": interaction["selected_variable"],
                "user_input": interaction.get("user_input", "")
            })
        return training