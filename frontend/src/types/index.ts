export interface User {
  id: string;
  email: string;
}

export interface AuthResponse {
  access_token: string;
  token_type: string;
}

export interface WishlistItem {
  id: string;
  user_id: string;
  url: string;
  title: string | null;
  image_url: string | null;
  priority: number; // 1 (Urgente/Mais alta) a 5 (Mais baixa)
  price?: number | string | null; // Opcional (front-end): exibido no card se a API fornecer
  created_at: string;
  updated_at?: string;
}

export interface WishlistPayload {
  url: string;
  title: string;
  image_url?: string | null;
  priority: number;
}

/** Critérios de ordenação suportados pela aplicação */
export type TipoOrdenacao =
  | 'prioridade_desc'
  | 'prioridade_asc'
  | 'recentes'
  | 'antigos'
  | 'alfabetica_az'
  | 'alfabetica_za';

/** Metadados de cada opção de ordenação */
export interface OpcaoOrdenacao {
  id: TipoOrdenacao;
  label: string;
  icon: string;
  descricao: string;
}

/** Estado consolidado dos filtros ativos */
export interface FiltrosDesejo {
  prioridade: number | 'ALL';
  loja: string | 'ALL';
  busca: string;
  ordem: TipoOrdenacao;
}