import os
from model import CustomVariableRecommender
from mongodb_client import MongoDBClient

def train():
    print("=" * 60)
    print("Training ML Model with REAL production data")
    print("=" * 60)

    db = MongoDBClient()
    real_data = db.get_training_data(days_back=90)
    print(f"Loaded {len(real_data)} real user interactions from MongoDB")

    if len(real_data) == 0:
        print("⚠️  No training data yet. Start using the application to collect data.")
        print("💡 Suggestions will improve automatically over time.")
        return None

    model = CustomVariableRecommender()
    model.train(real_data)
    model.save("models/variable_recommender.pkl")
    print("✅ Model training complete.")
    return model

if __name__ == "__main__":
    train()