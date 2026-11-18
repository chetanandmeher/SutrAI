import numpy as np
from sentence_transformers import SentenceTransformer

model = SentenceTransformer("all-MiniLM-L6-v2")

sentences = [
    "Customers are cancelling orders.",
    "Delayed shipments are causing cancellations.",
    "The weather is sunny today.",
]

embeddings = model.encode(sentences)
print("shape:", embeddings.shape)
print("first 5 values of vector 0:", embeddings[0][:5])


def cosine(a, b):
    return float(np.dot(a, b) / (np.linalg.norm(a) * np.linalg.norm(b)))


print("0 vs 1 (related):  ", round(cosine(embeddings[0], embeddings[1]), 3))
print("0 vs 2 (unrelated):", round(cosine(embeddings[0], embeddings[2]), 3))
print("1 vs 2 (unrelated):", round(cosine(embeddings[1], embeddings[2]), 3))


multi = SentenceTransformer("paraphrase-multilingual-MiniLM-L12-v2")

pt = "O produto chegou atrasado e veio quebrado."
en = "The product arrived late and was broken."
other = "The weather is sunny today."

for name, m in [("MiniLM English", model), ("Multilingual", multi)]:
    v = m.encode([pt, en, other])
    print(
        name,
        "| PT vs EN match:", round(cosine(v[0], v[1]), 3),
        "| PT vs unrelated:", round(cosine(v[0], v[2]), 3),
    )