# ml-service/src/model.py
import json
import math
import pickle
import os
from collections import defaultdict

class CustomVariableRecommender:
    def __init__(self):
        self.training_data = []
        self.training_labels = []
        self.vocabulary = {}
        self.feature_vectors = []
        self.variable_frequencies = defaultdict(int)
        self.k = 7
    
    def _tokenize(self, text):
        if not text:
            return []
        text = text.lower()
        for char in ".,;:!?()[]{}/\\|`~@#$%^&*=":
            text = text.replace(char, " ")
        return [w for w in text.split() if len(w) > 1]
    
    def _build_vocabulary(self, all_texts):
        word_counts = defaultdict(int)
        for text in all_texts:
            for word in self._tokenize(text):
                word_counts[word] += 1
        self.vocabulary = {}
        for word, count in word_counts.items():
            if count >= 2:
                self.vocabulary[word] = len(self.vocabulary)
    
    def _text_to_vector(self, text):
        if not self.vocabulary:
            return {}
        tokens = self._tokenize(text)
        term_freq = defaultdict(int)
        for token in tokens:
            if token in self.vocabulary:
                term_freq[token] += 1
        vector = {}
        total = len(tokens)
        for token, count in term_freq.items():
            vector[self.vocabulary[token]] = count / total
        return vector
    
    def _cosine_similarity(self, vec1, vec2):
        if not vec1 or not vec2:
            return 0
        dot = 0
        for idx in vec1:
            if idx in vec2:
                dot += vec1[idx] * vec2[idx]
        mag1 = math.sqrt(sum(v * v for v in vec1.values()))
        mag2 = math.sqrt(sum(v * v for v in vec2.values()))
        if mag1 == 0 or mag2 == 0:
            return 0
        return dot / (mag1 * mag2)
    
    def train(self, examples):
        print(f"📊 Training on {len(examples)} examples...")
        self.training_data = []
        self.training_labels = []
        all_texts = []
        
        for ex in examples:
            text = f"{ex['node_type']} {ex['field_name']} {ex.get('user_input', '')}"
            for ctx in ex.get('context_vars', [])[:3]:
                text += " " + ctx
            all_texts.append(text)
            self.training_data.append(text)
            self.training_labels.append(ex['selected_variable'])
            self.variable_frequencies[ex['selected_variable']] += 1
        
        self._build_vocabulary(all_texts)
        self.feature_vectors = [self._text_to_vector(t) for t in self.training_data]
        print(f"✅ Training complete! Vocabulary: {len(self.vocabulary)} words")
    
    def predict(self, node_type, field_name, context_vars, user_input="", k=7):
        # Build query text
        query_text = f"{node_type} {field_name} {user_input}"
        for ctx in context_vars[:3]:
            query_text += " " + ctx
        query_vector = self._text_to_vector(query_text)
        
        scores = defaultdict(float)
        
        if self.feature_vectors:
            # Calculate similarities with all training examples
            similarities = []
            for i, vec in enumerate(self.feature_vectors):
                sim = self._cosine_similarity(query_vector, vec)
                similarities.append((sim, i))
            
            # Sort by similarity (highest first)
            similarities.sort(key=lambda x: x[0], reverse=True)
            
            # Get top k neighbors
            top_k = similarities[:k]
            
            # Calculate total similarity for normalization
            total_sim = 0
            for sim, idx in top_k:
                if sim > 0:
                    total_sim += sim
            
            # Prevent division by zero
            if total_sim == 0:
                total_sim = 1
            
            # Score each variable
            for sim, idx in top_k:
                if sim > 0:
                    # Normalize similarity to ensure confidence <= 1.0
                    normalized_score = sim / total_sim
                    var = self.training_labels[idx]
                    scores[var] += normalized_score
        
        # Add popularity fallback (for variables never seen before)
        popular_vars = sorted(self.variable_frequencies.items(), key=lambda x: x[1], reverse=True)[:5]
        for var, count in popular_vars:
            if var not in scores:
                scores[var] = 0.1
        
        # Normalize final scores to ensure max is 1.0
        if scores:
            max_score = max(scores.values())
            if max_score > 0:
                for var in scores:
                    scores[var] = min(scores[var] / max_score, 1.0)
        
        # Sort and return
        sorted_vars = sorted(scores.items(), key=lambda x: x[1], reverse=True)
        result = []
        for var, score in sorted_vars[:k]:
            # Ensure score never exceeds 1.0
            final_score = min(score, 1.0)
            # Also ensure minimum 0.05 for visibility
            if final_score < 0.05:
                final_score = 0.05
            result.append({
                "variable": var,
                "score": round(final_score, 3),
                "source": "ml_model"
            })
        return result
    
    def save(self, filepath):
        os.makedirs(os.path.dirname(filepath), exist_ok=True)
        with open(filepath, 'wb') as f:
            pickle.dump({
                'vocabulary': self.vocabulary,
                'training_data': self.training_data,
                'training_labels': self.training_labels,
                'feature_vectors': self.feature_vectors,
                'variable_frequencies': dict(self.variable_frequencies),
                'k': self.k
            }, f)
        print(f"💾 Model saved to {filepath}")
    
    def load(self, filepath):
        if not os.path.exists(filepath):
            return False
        with open(filepath, 'rb') as f:
            data = pickle.load(f)
        self.vocabulary = data['vocabulary']
        self.training_data = data['training_data']
        self.training_labels = data['training_labels']
        self.feature_vectors = data['feature_vectors']
        self.variable_frequencies = data['variable_frequencies']
        self.k = data['k']
        print(f"📂 Model loaded from {filepath}")
        return True