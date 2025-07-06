#!/usr/bin/env node

/**
 * Script de diagnóstico para verificar Ollama e configurações
 * Uso: node diagnose-ollama.js
 */

import ollama from 'ollama';

const MODEL_NAME = 'qwen2.5-coder:7b-instruct';

async function testOllamaConnection() {
  console.log('🔍 Diagnóstico do Ollama...\n');

  // Teste 1: Verificar se o Ollama está rodando
  console.log('📡 Teste 1: Verificando conexão com Ollama...');
  try {
    const models = await ollama.list();
    console.log('✅ Ollama está rodando');
    console.log(`📋 Modelos disponíveis: ${models.models.length}`);
    models.models.forEach(model => {
      console.log(`   - ${model.name} (${model.size})`);
    });
    console.log('');
  } catch (error) {
    console.log('❌ Erro ao conectar com Ollama:', error.message);
    console.log('💡 Certifique-se de que o Ollama está rodando: ollama serve');
    return false;
  }

  // Teste 2: Verificar se o modelo específico está disponível
  console.log('🔍 Teste 2: Verificando modelo específico...');
  try {
    const models = await ollama.list();
    const targetModel = models.models.find(m => m.name === MODEL_NAME);
    
    if (targetModel) {
      console.log(`✅ Modelo ${MODEL_NAME} encontrado`);
      console.log(`   Tamanho: ${targetModel.size}`);
      console.log(`   Última modificação: ${targetModel.modified_at}`);
    } else {
      console.log(`❌ Modelo ${MODEL_NAME} não encontrado`);
      console.log('💡 Execute: ollama pull qwen2.5-coder:7b-instruct');
      return false;
    }
    console.log('');
  } catch (error) {
    console.log('❌ Erro ao verificar modelo:', error.message);
    return false;
  }

  return true;
}

async function testSimplePrompt() {
  console.log('📝 Teste 3: Testando prompt simples...');
  
  const simplePrompt = {
    model: MODEL_NAME,
    messages: [
      {
        role: 'user',
        content: 'Responda apenas com a palavra "teste"'
      }
    ],
    options: {
      temperature: 0.1,
      num_predict: 10
    }
  };

  try {
    const startTime = Date.now();
    const response = await ollama.chat(simplePrompt);
    const duration = Date.now() - startTime;
    
    console.log('✅ Prompt simples funcionou');
    console.log(`   Resposta: "${response.message.content}"`);
    console.log(`   Duração: ${duration}ms`);
    console.log('');
    return true;
  } catch (error) {
    console.log('❌ Erro no prompt simples:', error.message);
    return false;
  }
}

async function testSQLPrompt() {
  console.log('🗄️ Teste 4: Testando prompt SQL...');
  
  const sqlPrompt = {
    model: MODEL_NAME,
    messages: [
      {
        role: 'system',
        content: 'You are a SQL expert. Generate ONLY SQL queries wrapped in ```sql...``` blocks.'
      },
      {
        role: 'user',
        content: 'Generate a SQL query to select all products from a products table'
      }
    ],
    options: {
      temperature: 0.3,
      num_predict: 100,
      top_k: 50,
      top_p: 0.95
    }
  };

  try {
    const startTime = Date.now();
    const response = await ollama.chat(sqlPrompt);
    const duration = Date.now() - startTime;
    
    console.log('✅ Prompt SQL funcionou');
    console.log(`   Resposta: "${response.message.content}"`);
    console.log(`   Duração: ${duration}ms`);
    console.log(`   Tamanho: ${response.message.content.length} caracteres`);
    
    // Verificar se contém SQL
    const hasSQL = response.message.content.includes('```sql');
    console.log(`   Contém SQL: ${hasSQL ? '✅' : '❌'}`);
    console.log('');
    return hasSQL;
  } catch (error) {
    console.log('❌ Erro no prompt SQL:', error.message);
    return false;
  }
}

async function testDifferentConfigurations() {
  console.log('⚙️ Teste 5: Testando diferentes configurações...\n');

  const configs = [
    {
      name: 'Configuração Conservadora',
      options: {
        temperature: 0.1,
        num_predict: 50,
        top_k: 40,
        top_p: 0.9
      }
    },
    {
      name: 'Configuração Balanceada',
      options: {
        temperature: 0.3,
        num_predict: 100,
        top_k: 50,
        top_p: 0.95
      }
    },
    {
      name: 'Configuração Liberal',
      options: {
        temperature: 0.5,
        num_predict: 200,
        top_k: 60,
        top_p: 0.98
      }
    }
  ];

  for (const config of configs) {
    console.log(`🔧 Testando: ${config.name}`);
    
    try {
      const startTime = Date.now();
      const response = await ollama.chat({
        model: MODEL_NAME,
        messages: [
          {
            role: 'user',
            content: 'Generate a simple SQL SELECT query'
          }
        ],
        options: config.options
      });
      const duration = Date.now() - startTime;
      
      console.log(`   ✅ Sucesso - ${duration}ms`);
      console.log(`   Resposta: "${response.message.content.substring(0, 50)}..."`);
      console.log('');
    } catch (error) {
      console.log(`   ❌ Falha: ${error.message}`);
      console.log('');
    }
  }
}

async function main() {
  try {
    const connectionOk = await testOllamaConnection();
    if (!connectionOk) {
      console.log('💥 Diagnóstico interrompido devido a problemas de conexão');
      return;
    }

    const simpleOk = await testSimplePrompt();
    const sqlOk = await testSQLPrompt();
    
    if (simpleOk && sqlOk) {
      console.log('🎉 Diagnóstico básico: TUDO OK!');
      await testDifferentConfigurations();
    } else {
      console.log('⚠️ Diagnóstico básico: PROBLEMAS DETECTADOS');
      console.log('💡 Recomendações:');
      console.log('   1. Verifique se o modelo está carregado corretamente');
      console.log('   2. Tente reiniciar o Ollama: ollama serve');
      console.log('   3. Verifique a memória disponível');
    }
  } catch (error) {
    console.error('💥 Erro geral no diagnóstico:', error.message);
  }
}

main(); 