/**
 * compatibilidade_web.test.mjs — Testes de Compatibilidade e Prevenção de Warnings no React Native Web
 *
 * Validações TDD:
 * 1) Compatibilidade de Sombras: uso de "boxShadow" em vez de "shadow*" no Web
 * 2) Prevenção de Erro de Hidratação DOM: remoção de accessibilityRole="button" no Pressable container raiz
 * 3) Configuração de Drivers de Animação: useNativeDriver desativado no ambiente Web
 * 4) Compatibilidade de Eventos de Ponteiro: pointerEvents configurado em style no Web
 */

import { describe, it } from 'node:test';
import assert from 'node:assert';
import fs from 'node:fs';
import path from 'node:path';
import { fileURLToPath } from 'node:url';

const __filename = fileURLToPath(import.meta.url);
const __dirname = path.dirname(__filename);
const srcDir = path.resolve(__dirname, '../src');

describe('Compatibilidade React Native Web (TDD)', () => {
  describe('1. Presets de Sombras e "boxShadow"', () => {
    it('deve usar boxShadow e não props shadow* no tema web para evitar warning de depreciação', () => {
      const themeContent = fs.readFileSync(path.join(srcDir, 'theme.ts'), 'utf8');

      // Verifica que o tema possui suporte explícito a boxShadow
      assert.ok(
        themeContent.includes('boxShadow'),
        'theme.ts deve incluir suporte explícito a boxShadow'
      );

      // No Web, a exportação de shadows deve prover boxShadow
      const hasPlatformBranchForShadows =
        themeContent.includes('Platform.select') || themeContent.includes("Platform.OS === 'web'");
      assert.ok(
        hasPlatformBranchForShadows,
        'theme.ts deve diferenciar sombras na Web usando Platform.select ou condicional de plataforma'
      );
    });

    it('ProductCard deve usar boxShadow condicional ao hover no Web', () => {
      const productCardContent = fs.readFileSync(
        path.join(srcDir, 'components/home/ProductCard.tsx'),
        'utf8'
      );
      assert.ok(
        productCardContent.includes('boxShadow: hovered ?'),
        'ProductCard deve usar boxShadow dinâmico para hover no Web'
      );
    });
  });

  describe('2. Prevenção de Erro de Hidratação DOM (<button> descendant of <button>)', () => {
    it('ProductListItem não deve declarar accessibilityRole="button" no Pressable raiz', () => {
      const listItemContent = fs.readFileSync(
        path.join(srcDir, 'components/home/ProductListItem.tsx'),
        'utf8'
      );

      // O Pressable raiz é o primeiro elemento Pressable do componente
      const primeiroPressable = listItemContent.match(/<Pressable[^>]*>/)?.[0] || '';
      assert.ok(primeiroPressable.length > 0, 'Deve encontrar o Pressable raiz');
      assert.strictEqual(
        primeiroPressable.includes('accessibilityRole="button"'),
        false,
        'ProductListItem não deve ter accessibilityRole="button" na tag Pressable externa'
      );
    });

    it('ProductCard não deve declarar accessibilityRole="button" no Pressable raiz', () => {
      const cardContent = fs.readFileSync(
        path.join(srcDir, 'components/home/ProductCard.tsx'),
        'utf8'
      );

      // O Pressable raiz é o primeiro elemento Pressable do componente
      const primeiroPressable = cardContent.match(/<Pressable[^>]*>/)?.[0] || '';
      assert.ok(primeiroPressable.length > 0, 'Deve encontrar o Pressable raiz');
      assert.strictEqual(
        primeiroPressable.includes('accessibilityRole="button"'),
        false,
        'ProductCard não deve ter accessibilityRole="button" na tag Pressable externa'
      );
    });

    it('ChecklistDesejos deve isolar o checkbox e o botão de link em elementos irmãos', () => {
      const checklistContent = fs.readFileSync(
        path.join(srcDir, 'components/home/ChecklistDesejos.tsx'),
        'utf8'
      );
      assert.ok(
        checklistContent.includes('styles.corpoChecklist'),
        'ChecklistDesejos deve usar corpoChecklist para separar o checkbox do botão de link'
      );
    });
  });

  describe('3. Configuração de useNativeDriver em Animações', () => {
    it('ProductListItem deve configurar useNativeDriver condicional à plataforma', () => {
      const content = fs.readFileSync(
        path.join(srcDir, 'components/home/ProductListItem.tsx'),
        'utf8'
      );
      assert.ok(
        content.includes("useNativeDriver: Platform.OS !== 'web'"),
        'ProductListItem deve usar Platform.OS !== "web" para useNativeDriver'
      );
    });

    it('ProductCard deve configurar useNativeDriver condicional à plataforma', () => {
      const content = fs.readFileSync(
        path.join(srcDir, 'components/home/ProductCard.tsx'),
        'utf8'
      );
      assert.ok(
        content.includes("useNativeDriver: Platform.OS !== 'web'"),
        'ProductCard deve usar Platform.OS !== "web" para useNativeDriver'
      );
    });
  });

  describe('4. Compatibilidade de pointerEvents no Web', () => {
    it('BottomNav não deve passar pointerEvents como prop direta no Web', () => {
      const content = fs.readFileSync(
        path.join(srcDir, 'components/home/BottomNav.tsx'),
        'utf8'
      );
      const hasBareProp = /<View\s+pointerEvents="box-none"/.test(content);
      assert.strictEqual(
        hasBareProp,
        false,
        'BottomNav não deve usar a prop legada pointerEvents="box-none" sem compatibilizar via style no Web'
      );
    });
  });
});
