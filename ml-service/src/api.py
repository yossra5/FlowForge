from fastapi import FastAPI
from fastapi.middleware.cors import CORSMiddleware
from pydantic import BaseModel
from typing import List
import uvicorn
import os
from model import CustomVariableRecommender
from mongodb_client import MongoDBClient
from trainer import train

app = FastAPI(title="FlowForge ML Service")
app.add_middleware(CORSMiddleware, allow_origins=["*"], allow_credentials=True, allow_methods=["*"], allow_headers=["*"])

model_path = "models/variable_recommender.pkl"
model = CustomVariableRecommender()
if os.path.exists(model_path):
    model.load(model_path)
    print(f"✅ Model loaded. Trained on {len(model.training_data)} examples")
else:
    print("⚠️  No model found. Run trainer.py first or wait for data.")
    model = None

db = MongoDBClient()

class PredictRequest(BaseModel):
    node_type: str
    field_name: str
    user_input: str = ""
    context_vars: List[str] = []

class FeedbackRequest(BaseModel):
    workflow_id: str
    node_id: str
    node_type: str
    field_name: str
    user_input: str = ""
    selected_variable: str
    context_vars: List[str] = []

@app.get("/health")
async def health():
    return {"status": "ok", "model_ready": model is not None, "training_examples": len(model.training_data) if model else 0}

@app.post("/predict")
async def predict(request: PredictRequest):
    if model is None:
        return {"suggestions": []}
    suggestions = model.predict(
        node_type=request.node_type,
        field_name=request.field_name,
        context_vars=request.context_vars,
        user_input=request.user_input,
        k=7
    )
    return {"suggestions": suggestions}

@app.post("/feedback")
async def feedback(request: FeedbackRequest):
    # Store in MongoDB immediately (this is your REAL training data)
    db.collection.insert_one(request.dict())
    print(f"📝 Feedback stored. Total interactions: {db.collection.count_documents({})}")
    return {"status": "recorded"}

@app.post("/retrain")
async def retrain():
    global model
    model = train()
    return {"status": "retrained"}

if __name__ == "__main__":
    uvicorn.run(app, host="0.0.0.0", port=8001)