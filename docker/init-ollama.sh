#!/bin/sh
set -e

echo "Starting Ollama server..."
ollama serve &
OLLAMA_PID=$!

echo "Waiting for Ollama server to start..."
sleep 20

echo "Checking if Ollama server is running..."
if ! curl -s http://localhost:11434/api/tags > /dev/null; then
  echo "Ollama server not responding yet, waiting longer..."
  sleep 30
fi

echo "Listing available models..."
ollama list

echo "Pulling model llama2..."
ollama pull llama2

echo "Model pulled successfully. Listing models:"
ollama list

echo "Waiting for Ollama server to continue running..."
wait $OLLAMA_PID 