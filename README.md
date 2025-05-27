# Kommo CRM Dashboard

Dashboard de vendas e marketing para visualização de dados do Kommo CRM, integrado com a API backend FastAPI.

## 📋 Descrição

Este projeto é um dashboard de visualização de métricas e KPIs para o Kommo CRM, construído com React e Vite. O dashboard se comunica com uma API backend em FastAPI para obter dados em tempo real.

## 🚀 Instalação

### Pré-requisitos

- Node.js (versão 16 ou superior)
- npm ou yarn
- Backend Kommo Dashboard API rodando (veja instruções do backend)

### Passos para instalação

1. Clone o repositório:
```bash
git clone https://github.com/seu-usuario/kommo-dashboard-frontend.git
cd kommo-dashboard-frontend
```

2. Instale as dependências:
```bash
npm install
# ou
yarn
```

3. Crie um arquivo `.env` na raiz do projeto e configure a URL da API:
```
VITE_API_URL=http://localhost:8000
```

## ⚙️ Configuração

1. Certifique-se de que o backend está rodando e acessível no endereço configurado no arquivo `.env`
2. Se necessário, ajuste as configurações no arquivo `.env` para apontar para a URL correta do backend

## 🏃‍♂️ Executando o projeto

Execute o servidor de desenvolvimento:
```bash
npm run dev
# ou
yarn dev
```

A aplicação estará disponível em `http://localhost:5173`

## 🛠️ Build para produção

Para gerar a versão de produção:
```bash
npm run build
# ou
yarn build
```

Os arquivos otimizados serão gerados na pasta `dist`.

## 🔧 Tecnologias utilizadas

- [React](https://reactjs.org/) - Biblioteca JavaScript para construção de interfaces
- [Vite](https://vitejs.dev/) - Build tool rápida para desenvolvimento web moderno
- [Recharts](https://recharts.org/) - Biblioteca de gráficos para React baseada em D3.js

## 📊 Funcionalidades

O dashboard exibe as seguintes métricas:

- Tempo médio de ciclo de leads
- Taxa de conversão (win rate)
- Distribuição de leads por fonte
- Distribuição de leads por estágio do funil
- Leads por usuário/corretor
- Métricas de satisfação do cliente (NPS, CSAT)
- Gráficos de tendências ao longo do tempo

## 🔄 Integração com o Backend

O dashboard se comunica com o backend Kommo Dashboard API através de requisições HTTP. O serviço `KommoAPI` encapsula todas as chamadas à API, facilitando o acesso aos dados.

Para mais detalhes sobre os endpoints disponíveis, consulte a documentação do backend ou acesse a documentação interativa em `http://localhost:8000/docs`.