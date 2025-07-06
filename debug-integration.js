#!/usr/bin/env node

/**
 * Script de debug para testar integração específica
 * Uso: node debug-integration.js
 */

import ollama from 'ollama';
import { PromptBuilder } from './src/core/PromptBuilder.js';

const MODEL_NAME = 'qwen2.5-coder:7b-instruct';

async function testIntegration() {
  console.log('🔍 Testando integração específica...\n');

  const promptBuilder = new PromptBuilder();
  
  try {
    // Teste 1: Construir prompt usando seu PromptBuilder
    console.log('📝 Teste 1: Construindo prompt com PromptBuilder...');
    const messages = await promptBuilder.build('Quero ver todas as minhas vendas');
    
    console.log('✅ Prompt construído:');
    console.log('System:', messages[0].content);
    console.log('User:', messages[1].content);
    console.log('Total tokens:', JSON.stringify(messages).length);
    console.log('');

    // Teste 2: Enviar para Ollama com configurações do seu sistema
    console.log('📡 Teste 2: Enviando para Ollama...');
    
    const startTime = Date.now();
    const response = await ollama.chat({
      model: MODEL_NAME,
      messages: messages,
      options: {
        threads: 8,
        num_predict: 1024,
        temperature: 0.3,
        top_k: 50,
        top_p: 0.95,
        repeat_penalty: 1.05,
        stop: ["```", "Final Answer:"]
      }
    });
    const duration = Date.now() - startTime;
    
    console.log('✅ Resposta recebida:');
    console.log(`   Duração: ${duration}ms`);
    console.log(`   Tamanho: ${response.message.content.length} caracteres`);
    console.log(`   Conteúdo: "${response.message.content}"`);
    console.log('');

    // Teste 3: Verificar se contém SQL
    const hasSQL = response.message.content.includes('```sql');
    console.log(`🔍 Contém SQL: ${hasSQL ? '✅' : '❌'}`);
    
    if (hasSQL) {
      const sqlMatch = response.message.content.match(/```sql\n([\s\S]*?)\n```/);
      if (sqlMatch) {
        console.log(`📋 SQL extraído: ${sqlMatch[1].trim()}`);
      }
    }

  } catch (error) {
    console.log('❌ Erro na integração:', error.message);
    console.log('Stack:', error.stack);
  }
}

async function testDirectOllama() {
  console.log('\n🔧 Teste alternativo: Ollama direto...\n');
  
  try {
    const startTime = Date.now();
    const response = await ollama.chat({
      model: MODEL_NAME,
      messages: [
        { role: 'system', content: 'Generate SQL queries. Format: ```sql...```' },
        { role: 'user', content: 'Question: Quero ver todas as minhas vendas' }
      ],
      options: {
        threads: 8,
        num_predict: 1024,
        temperature: 0.3,
        top_k: 50,
        top_p: 0.95,
        repeat_penalty: 1.05,
        stop: ["```", "Final Answer:"]
      }
    });
    const duration = Date.now() - startTime;
    
    console.log('✅ Resposta direta:');
    console.log(`   Duração: ${duration}ms`);
    console.log(`   Tamanho: ${response.message.content.length} caracteres`);
    console.log(`   Conteúdo: "${response.message.content}"`);
    
  } catch (error) {
    console.log('❌ Erro no teste direto:', error.message);
  }
}

async function main() {
  await testIntegration();
  await testDirectOllama();
}

main(); 