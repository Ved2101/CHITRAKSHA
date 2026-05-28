import sys
import os
sys.path.append(os.path.abspath('backend'))
from rag import RAGPipeline
rag = RAGPipeline()
crisis, stream = rag.generate_response_stream("me bohot pareshan hu", 25)
print("Crisis:", crisis)
try:
    for chunk in stream:
        print(repr(chunk))
except Exception as e:
    print("Error:", e)
