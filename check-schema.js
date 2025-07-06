#!/usr/bin/env node

/**
 * Script para verificar o schema do banco de dados
 * Uso: node check-schema.js
 */

import { DatabaseScanner } from './src/core/DatabaseScanner.js';

async function checkSchema() {
  console.log('🔍 Verificando schema do banco de dados...\n');

  try {
    const scanner = new DatabaseScanner();
    const schema = await scanner.getDatabaseStructure();
    
    console.log(`✅ Schema encontrado: ${schema.length} tabelas\n`);
    
    schema.forEach((table, index) => {
      console.log(`${index + 1}. Tabela: ${table.table_name}`);
      console.log(`   Colunas: ${table.columns.join(', ')}`);
      console.log('');
    });
    
    // Sugestões de queries baseadas no schema
    console.log('💡 Sugestões de queries baseadas no schema:');
    schema.forEach(table => {
      console.log(`   - SELECT * FROM ${table.table_name};`);
      if (table.columns.includes('id')) {
        console.log(`   - SELECT * FROM ${table.table_name} WHERE id = 1;`);
      }
      if (table.columns.includes('name') || table.columns.includes('nome')) {
        console.log(`   - SELECT * FROM ${table.table_name} WHERE name LIKE '%test%';`);
      }
    });
    
  } catch (error) {
    console.log('❌ Erro ao verificar schema:', error.message);
  }
}

checkSchema(); 