#!/usr/bin/env node

/**
 * Script de teste para verificar logs e performance do endpoint
 * Uso: node test-logs.js
 */

const BASE_URL = 'http://localhost:3001';

async function testEndpoint() {
  console.log('🧪 Iniciando testes de logging...\n');

  // Teste 1: Fazer uma pergunta
  console.log('📝 Teste 1: Fazendo pergunta...');
  try {
    const response = await fetch(`${BASE_URL}/ask`, {
      method: 'POST',
      headers: {
        'Content-Type': 'application/json',
      },
      body: JSON.stringify({
        question: 'Mostre os produtos mais vendidos'
      })
    });

    const result = await response.json();
    console.log('✅ Resposta recebida:');
    console.log(`   Request ID: ${result.requestId}`);
    console.log(`   Duração: ${result.duration}`);
    console.log(`   Tamanho da resposta: ${result.response?.length || 0} caracteres`);
    console.log('');
  } catch (error) {
    console.log('❌ Erro no teste 1:', error.message);
  }

  // Teste 2: Verificar logs
  console.log('📊 Teste 2: Verificando logs...');
  try {
    const response = await fetch(`${BASE_URL}/logs`);
    const logs = await response.json();
    
    console.log(`✅ Logs encontrados: ${logs.total}`);
    console.log('📋 Últimos 5 logs:');
    
    logs.logs.slice(-5).forEach(log => {
      const emoji = {
        'INFO': '📝',
        'WARN': '⚠️',
        'ERROR': '❌',
        'DEBUG': '🔍'
      }[log.level];
      
      console.log(`   ${emoji} [${log.timestamp}] ${log.component}: ${log.message}${log.duration ? ` (${log.duration}ms)` : ''}`);
    });
    console.log('');
  } catch (error) {
    console.log('❌ Erro no teste 2:', error.message);
  }

  // Teste 3: Verificar logs por componente
  console.log('🔍 Teste 3: Logs por componente (ENDPOINT)...');
  try {
    const response = await fetch(`${BASE_URL}/logs?component=ENDPOINT`);
    const logs = await response.json();
    
    console.log(`✅ Logs do componente ENDPOINT: ${logs.total}`);
    logs.logs.forEach(log => {
      console.log(`   📝 [${log.timestamp}] ${log.message}${log.duration ? ` (${log.duration}ms)` : ''}`);
    });
    console.log('');
  } catch (error) {
    console.log('❌ Erro no teste 3:', error.message);
  }

  // Teste 4: Health check
  console.log('🏥 Teste 4: Health check...');
  try {
    const response = await fetch(`${BASE_URL}/health`);
    const health = await response.json();
    
    console.log('✅ Status do servidor:');
    console.log(`   Status: ${health.status}`);
    console.log(`   Uptime: ${Math.round(health.uptime)}s`);
    console.log(`   Memória: ${Math.round(health.memory.heapUsed / 1024 / 1024)}MB`);
    console.log('');
  } catch (error) {
    console.log('❌ Erro no teste 4:', error.message);
  }

  // Teste 5: Exportar logs
  console.log('💾 Teste 5: Exportando logs...');
  try {
    const response = await fetch(`${BASE_URL}/logs/export`);
    const logsJson = await response.text();
    
    console.log('✅ Logs exportados com sucesso');
    console.log(`   Tamanho: ${logsJson.length} caracteres`);
    console.log('');
  } catch (error) {
    console.log('❌ Erro no teste 5:', error.message);
  }

  console.log('🎉 Testes concluídos!');
}

// Função para testar performance
async function testPerformance() {
  console.log('⚡ Teste de Performance...\n');

  const questions = [
    'Quantos produtos temos no banco?',
    'Mostre os clientes mais ativos',
    'Qual o total de vendas por mês?',
    'Liste os produtos com estoque baixo',
    'Mostre o histórico de pedidos'
  ];

  const results = [];

  for (let i = 0; i < questions.length; i++) {
    const question = questions[i];
    console.log(`📝 Teste ${i + 1}/${questions.length}: ${question}`);
    
    const startTime = Date.now();
    try {
      const response = await fetch(`${BASE_URL}/ask`, {
        method: 'POST',
        headers: {
          'Content-Type': 'application/json',
        },
        body: JSON.stringify({ question })
      });

      const result = await response.json();
      const duration = Date.now() - startTime;
      
      results.push({
        question,
        duration,
        success: !result.error,
        responseLength: result.response?.length || 0
      });

      console.log(`   ✅ ${duration}ms - ${result.response?.length || 0} chars`);
    } catch (error) {
      results.push({
        question,
        duration: Date.now() - startTime,
        success: false,
        error: error.message
      });
      console.log(`   ❌ ${Date.now() - startTime}ms - Erro: ${error.message}`);
    }
  }

  // Estatísticas
  console.log('\n📊 Estatísticas de Performance:');
  const successful = results.filter(r => r.success);
  const avgDuration = successful.length > 0 
    ? Math.round(successful.reduce((sum, r) => sum + r.duration, 0) / successful.length)
    : 0;
  
  console.log(`   Total de testes: ${results.length}`);
  console.log(`   Sucessos: ${successful.length}`);
  console.log(`   Duração média: ${avgDuration}ms`);
  console.log(`   Duração mínima: ${Math.min(...successful.map(r => r.duration))}ms`);
  console.log(`   Duração máxima: ${Math.max(...successful.map(r => r.duration))}ms`);
}

// Executar testes
async function main() {
  try {
    await testEndpoint();
    console.log('\n' + '='.repeat(50) + '\n');
    await testPerformance();
  } catch (error) {
    console.error('💥 Erro geral:', error.message);
  }
}

main(); 