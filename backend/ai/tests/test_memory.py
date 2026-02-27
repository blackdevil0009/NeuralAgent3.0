from ai.memory import VectorMemory, KnowledgeGraph

def test_vector_memory():
    # Dimension 384 for all-MiniLM-L6-v2
    memory = VectorMemory(dimension=384)
    memory.add_to_memory("NeuralAgent is a clinical AI.")
    memory.add_to_memory("Vata dosha represents air.")
    
    results = memory.search("clinical AI")
    assert len(results) > 0
    assert "clinical AI" in results[0]['text']
    print("Vector Memory Test Passed!")

def test_knowledge_graph():
    kg = KnowledgeGraph()
    kg.add_concept("Ashwagandha", "Herb")
    kg.connect_concepts("Ashwagandha", "Vata", "balances")
    
    related = kg.get_subgraph("Ashwagandha")
    assert len(related) > 0
    assert related[0][1] == "Vata"
    print("Knowledge Graph Test Passed!")

if __name__ == "__main__":
    test_vector_memory()
    test_knowledge_graph()
