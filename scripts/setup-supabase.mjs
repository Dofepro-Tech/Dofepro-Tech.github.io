import { createClient } from '@supabase/supabase-client';
import dotenv from 'dotenv';
import path from 'path';
import { fileURLToPath } from 'url';

const __filename = fileURLToPath(import.meta.url);
const __dirname = path.dirname(__filename);
const projectRoot = path.resolve(__dirname, '..');

dotenv.config({ path: path.resolve(projectRoot, '.env.local') });

const supabaseUrl = process.env.SUPABASE_URL;
const supabaseKey = process.env.SUPABASE_SERVICE_ROLE_KEY;

if (!supabaseUrl || !supabaseKey) {
  console.error('Error: SUPABASE_URL y SUPABASE_SERVICE_ROLE_KEY deben estar en .env.local');
  process.exit(1);
}

const supabase = createClient(supabaseUrl, supabaseKey);

async function setup() {
  console.log('Iniciando configuración de tablas en Supabase...');

  // 1. Crear tabla de libros
  const { error: booksError } = await supabase.rpc('track_setup', {
    sql: `
      CREATE TABLE IF NOT EXISTS bible_books (
        id SERIAL PRIMARY KEY,
        abrev TEXT UNIQUE NOT NULL,
        name TEXT NOT NULL,
        testament TEXT NOT NULL,
        chapters INTEGER NOT NULL,
        created_at TIMESTAMPTZ DEFAULT NOW()
      );
    `
  });

  // Nota: Si el RPC no está habilitado, esto puede fallar.
  // En ese caso, el usuario debería pegar el SQL en el SQL Editor de Supabase.

  console.log('Tablas creadas correctamente (si el RPC track_setup está habilitado).');
  console.log('Si no ves las tablas, copia este SQL en el SQL Editor de Supabase:');
  console.log(`
    CREATE TABLE IF NOT EXISTS bible_books (
      id SERIAL PRIMARY KEY,
      abrev TEXT UNIQUE NOT NULL,
      name TEXT NOT NULL,
      testament TEXT NOT NULL,
      chapters INTEGER NOT NULL,
      created_at TIMESTAMPTZ DEFAULT NOW()
    );

    CREATE TABLE IF NOT EXISTS bible_verses (
      id SERIAL PRIMARY KEY,
      book_abrev TEXT REFERENCES bible_books(abrev),
      chapter INTEGER NOT NULL,
      verse_number INTEGER NOT NULL,
      content TEXT NOT NULL,
      version TEXT DEFAULT 'RV1960',
      created_at TIMESTAMPTZ DEFAULT NOW(),
      UNIQUE(book_abrev, chapter, verse_number, version)
    );
  `);
}

// Para esta fase inicial, simplemente confirmamos la conexión
console.log('Conexión con Supabase configurada en .env.local');
