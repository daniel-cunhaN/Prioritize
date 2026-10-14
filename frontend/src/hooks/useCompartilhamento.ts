/**
 * useCompartilhamento.ts — Hook para Escuta de Compartilhamentos e Deep Links
 *
 * Captura dados compartilhados de outros aplicativos via:
 * 1. Intent nativo de compartilhamento do Android / iOS (expo-share-intent)
 * 2. Deep linking customizado (prioritize://share?url=...) via expo-linking
 * 3. Parâmetros de URL em navegadores Web (?url=... ou ?text=...)
 *
 * Extrai links HTTP/HTTPS válidos e os disponibiliza para o fluxo de inclusão de desejos.
 */

import { useState, useEffect, useCallback } from 'react';
import { Platform } from 'react-native';
import * as Linking from 'expo-linking';
import { useShareIntent } from 'expo-share-intent';
import {
  extrairUrlValida,
  definirUrlCompartilhadaPendente,
  obterUrlCompartilhadaPendente,
  consumirUrlCompartilhadaPendente,
} from '../utils/compartilhamento';

export function useCompartilhamento() {
  const [urlDetectada, setUrlDetectada] = useState<string | null>(null);

  // Hook nativo de recepção de compartilhamentos (Android SEND Intent e iOS Share Extension)
  const { hasShareIntent, shareIntent, resetShareIntent } = useShareIntent({
    disabled: Platform.OS === 'web',
  });

  /**
   * Processa uma string bruta compartilhada e atualiza a URL detectada
   */
  const processarTextoCompartilhado = useCallback((textoBruto?: string | null) => {
    if (!textoBruto) return;

    const urlExtraida = extrairUrlValida(textoBruto);
    if (urlExtraida) {
      setUrlDetectada(urlExtraida);
      // Salva em memória caso o usuário precise autenticar antes de abrir o modal
      definirUrlCompartilhadaPendente(urlExtraida);
    }
  }, []);

  // 1. Escuta alterações no intent nativo de compartilhamento (Android / iOS)
  useEffect(() => {
    if (hasShareIntent && (shareIntent.text || shareIntent.webUrl)) {
      const conteudo = shareIntent.webUrl || shareIntent.text;
      processarTextoCompartilhado(conteudo);
      resetShareIntent();
    }
  }, [hasShareIntent, shareIntent, processarTextoCompartilhado, resetShareIntent]);

  // 2. Escuta Deep Links diretos via expo-linking (prioritize://share?url=...)
  useEffect(() => {
    // Na Web, o getInitialURL() do Expo retorna a própria URL da janela (window.location.href),
    // o que causaria a reabertura indevida do modal ao recarregar a página (F5 / reload).
    if (Platform.OS === 'web') {
      return;
    }

    // Captura inicial caso o app tenha sido aberto por um deep link no mobile
    Linking.getInitialURL()
      .then((urlInicial) => {
        if (urlInicial) {
          processarTextoCompartilhado(urlInicial);
        }
      })
      .catch((erro) => {
        console.warn('Erro ao obter URL inicial de deep link:', erro);
      });

    // Escuta eventos de deep link com o app já em execução
    const inscricao = Linking.addEventListener('url', (evento) => {
      if (evento?.url) {
        processarTextoCompartilhado(evento.url);
      }
    });

    return () => {
      inscricao.remove();
    };
  }, [processarTextoCompartilhado]);

  // 3. Captura parâmetros na Web (?url=... ou ?text=...)
  useEffect(() => {
    if (Platform.OS === 'web' && typeof window !== 'undefined' && window.location?.search) {
      const params = new URLSearchParams(window.location.search);
      const urlWeb = params.get('url') || params.get('text');
      if (urlWeb) {
        processarTextoCompartilhado(decodeURIComponent(urlWeb));

        // Limpa a query string da barra de endereços para não reabrir em recarregamentos (F5 / reload)
        try {
          const urlLimpa = window.location.pathname + window.location.hash;
          window.history.replaceState({}, document.title, urlLimpa);
        } catch (erro) {
          console.warn('Não foi possível higienizar a URL na barra de endereços:', erro);
        }
      }
    }
  }, [processarTextoCompartilhado]);

  /**
   * Consome a URL detectada, limpando o estado local e a memória pendente
   */
  const consumirUrl = useCallback((): string | null => {
    const url = urlDetectada || consumirUrlCompartilhadaPendente();
    setUrlDetectada(null);
    return url;
  }, [urlDetectada]);

  return {
    urlCompartilhada: urlDetectada || obterUrlCompartilhadaPendente(),
    consumirUrl,
  };
}
