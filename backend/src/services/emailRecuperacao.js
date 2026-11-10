/**
 * emailRecuperacao.js — Serviço Híbrido de Entrega de Token de Recuperação de Senha
 *
 * Opera em modo híbrido:
 * 1. Registra o token formatado no console do Backend para inspeção rápida.
 * 2. Se houver configuração de serviço de e-mail externo (SMTP_WEBHOOK_URL ou SMTP_HOST),
 *    realiza o disparo da mensagem.
 * 3. Em ambiente local / apresentação acadêmica (sem servidor SMTP externo), retorna
 *    modo_entrega = 'simulado' com o token de demonstração para exibição direta na UI.
 */

import net from 'node:net';
import tls from 'node:tls';

/**
 * Envia o código de recuperação de senha para o endereço de e-mail informado.
 * @param {string} email Endereço de e-mail do destinatário.
 * @param {string} token Código numérico de 6 dígitos gerado.
 * @param {number} validadeMinutos Tempo de expiração em minutos.
 * @returns {Promise<{ enviado: boolean, modoEntrega: 'smtp' | 'simulado', tokenPreview?: string }>}
 */
export async function enviarEmailRecuperacao(email, token, validadeMinutos = 15) {
  // Exibe um bloco formatado no terminal do servidor para facilitar testes e auditoria
  console.log('\n======================================================');
  console.log(' [Prioritize Auth] TOKEN DE RECUPERAÇÃO DE SENHA');
  console.log(` -> Destinatário : ${email}`);
  console.log(` -> Token (6 díg): ${token}`);
  console.log(` -> Validade     : ${validadeMinutos} minutos`);
  console.log('======================================================\n');

  const smtpHost = process.env.SMTP_HOST;
  const smtpPort = Number(process.env.SMTP_PORT || 587);
  const smtpUser = process.env.SMTP_USER;
  const smtpPass = process.env.SMTP_PASS;
  const smtpFrom = process.env.SMTP_FROM || smtpUser || 'no-reply@prioritize.app';

  // Caso as variáveis de ambiente SMTP estejam configuradas, tenta o envio real via socket SMTP
  if (smtpHost && smtpUser && smtpPass) {
    try {
      await dispararSmtpSimples({
        host: smtpHost,
        port: smtpPort,
        user: smtpUser,
        pass: smtpPass,
        from: smtpFrom,
        to: email,
        subject: `Prioritize — Seu código de recuperação: ${token}`,
        text: [
          'Olá!',
          '',
          'Recebemos uma solicitação para redefinir a senha da sua conta no Prioritize.',
          `Seu token de recuperação de 6 dígitos é: ${token}`,
          '',
          `Este código expira em ${validadeMinutos} minutos.`,
          'Se você não solicitou esta alteração, ignore esta mensagem.',
        ].join('\r\n'),
      });

      return {
        enviado: true,
        modoEntrega: 'smtp',
        tokenPreview: process.env.EXIBIR_TOKEN_TELA === 'false' ? undefined : token,
      };
    } catch (erroSmtp) {
      console.warn('[Prioritize Auth] Falha no envio SMTP, utilizando fallback híbrido simulado:', erroSmtp.message);
    }
  }

  // Modo híbrido / simulador para desenvolvimento e demonstração sem dependência externa
  return {
    enviado: true,
    modoEntrega: 'simulado',
    tokenPreview: token,
  };
}

/**
 * Cliente SMTP minimalista nativo (sem dependências externas) para envio de texto simples
 * quando um servidor SMTP é configurado no arquivo .env.
 */
function dispararSmtpSimples({ host, port, user, pass, from, to, subject, text }) {
  return new Promise((resolve, reject) => {
    const usarTlsDireto = port === 465;
    const socket = usarTlsDireto
      ? tls.connect({ host, port, rejectUnauthorized: false })
      : net.createConnection({ host, port });

    socket.setTimeout(6000);

    let etapa = 0;
    const comandos = [
      `EHLO prioritize.local`,
      `AUTH LOGIN`,
      Buffer.from(user).toString('base64'),
      Buffer.from(pass).toString('base64'),
      `MAIL FROM:<${from}>`,
      `RCPT TO:<${to}>`,
      `DATA`,
      `From: Prioritize <${from}>\r\nTo: <${to}>\r\nSubject: ${subject}\r\nContent-Type: text/plain; charset=utf-8\r\n\r\n${text}\r\n.`,
      `QUIT`,
    ];

    socket.on('data', (dados) => {
      const resposta = dados.toString();
      const codigo = parseInt(resposta.slice(0, 3), 10);
      if (codigo >= 400) {
        socket.destroy();
        return reject(new Error(`Erro SMTP (${codigo}): ${resposta.trim()}`));
      }
      if (etapa < comandos.length) {
        const cmd = comandos[etapa++];
        socket.write(`${cmd}\r\n`);
      } else {
        socket.end();
        resolve(true);
      }
    });

    socket.on('timeout', () => {
      socket.destroy();
      reject(new Error('Timeout na conexão SMTP'));
    });

    socket.on('error', (err) => {
      reject(err);
    });
  });
}
