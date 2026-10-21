export const openapi = {
  openapi: '3.0.3',
  info: {
    title: 'CoinVisio API',
    version: '1.0.0'
  },
  servers: [{ url: '/' }],
  components: {
    securitySchemes: {
      bearerAuth: {
        type: 'http',
        scheme: 'bearer',
        bearerFormat: 'JWT'
      }
    },
    schemas: {
      AuthSignupRequest: {
        type: 'object',
        properties: {
          fullName: { type: 'string' },
          email: { type: 'string' },
          password: { type: 'string' },
          passwordConfirm: { type: 'string' },
          riskTolerance: { type: 'integer', enum: [0, 1, 2] }
        }
      },
      AuthLoginRequest: {
        type: 'object',
        properties: {
          email: { type: 'string' },
          password: { type: 'string' }
        }
      },
      AuthResponse: {
        type: 'object',
        properties: {
          message: { type: 'string' },
          accessToken: { type: 'string' },
          refreshToken: { type: 'string' },
          user: { type: 'object', additionalProperties: true }
        }
      },
      Coin: {
        type: 'object',
        properties: {
          symbol: { type: 'string' },
          name: { type: 'string' },
          logoUrl: { type: 'string', nullable: true }
        }
      },
      CryptoPrice: {
        type: 'object',
        properties: {
          id: { type: 'integer' },
          symbol: { type: 'string' },
          recordedAt: { type: 'string', format: 'date-time' },
          open: { type: 'number', nullable: true },
          high: { type: 'number', nullable: true },
          low: { type: 'number', nullable: true },
          close: { type: 'number', nullable: true },
          volume: { type: 'number', nullable: true }
        }
      },
      WatchlistItem: {
        type: 'object',
        properties: {
          symbol: { type: 'string' },
          name: { type: 'string', nullable: true },
          logoUrl: { type: 'string', nullable: true }
        }
      },
      DailyInsight: {
        type: 'object',
        properties: {
          id: { type: 'integer' },
          insightText: { type: 'string' },
          sentiment: { type: 'string', nullable: true },
          createdAt: { type: 'string', format: 'date-time', nullable: true }
        }
      },
      MarketRegime: {
        type: 'object',
        properties: {
          id: { type: 'integer' },
          regimeLabel: { type: 'string' },
          clusterId: { type: 'integer' },
          avgVolatility: { type: 'number', nullable: true },
          avgReturn: { type: 'number', nullable: true },
          description: { type: 'string', nullable: true },
          createdAt: { type: 'string', format: 'date-time', nullable: true }
        }
      },
      CoinRecommendation: {
        type: 'object',
        properties: {
          rsi: { type: 'number', nullable: true },
          price: { type: 'number', nullable: true },
          symbol: { type: 'string' },
          returns: { type: 'number', nullable: true },
          volatility: { type: 'number', nullable: true },
          volume_change: { type: 'number', nullable: true }
        }
      },
      Recommendation: {
        type: 'object',
        properties: {
          id: { type: 'integer' },
          riskProfile: { type: 'string' },
          coins: {
            type: 'array',
            items: { $ref: '#/components/schemas/CoinRecommendation' }
          },
          updatedAt: { type: 'string', format: 'date-time' }
        }
      },
      SmartSignal: {
        type: 'object',
        properties: {
          id: { type: 'integer' },
          symbol: { type: 'string' },
          term: { type: 'string' },
          signalType: { type: 'string' },
          entryPrice: { type: 'number', nullable: true },
          targetPrice: { type: 'number', nullable: true },
          stopLoss: { type: 'number', nullable: true },
          confidenceScore: { type: 'number', nullable: true },
          createdAt: { type: 'string', format: 'date-time' }
        }
      },
      CoinAnomaly: {
        type: 'object',
        properties: {
          id: { type: 'integer' },
          symbol: { type: 'string' },
          anomalyScore: { type: 'number', nullable: true },
          anomalyType: { type: 'string', nullable: true },
          priceAtDetection: { type: 'number', nullable: true },
          detectedAt: { type: 'string', format: 'date-time', nullable: true }
        }
      }
    }
  },
  paths: {
    '/api/Auth/signup': {
      post: {
        summary: 'Sign up',
        requestBody: {
          required: true,
          content: {
            'application/json': {
              schema: { $ref: '#/components/schemas/AuthSignupRequest' }
            }
          }
        },
        responses: {
          200: { description: 'OK', content: { 'application/json': { schema: { $ref: '#/components/schemas/AuthResponse' } } } },
          400: { description: 'Bad Request' }
        }
      }
    },
    '/api/Auth/login': {
      post: {
        summary: 'Login',
        requestBody: {
          required: true,
          content: {
            'application/json': {
              schema: { $ref: '#/components/schemas/AuthLoginRequest' }
            }
          }
        },
        responses: {
          200: { description: 'OK', content: { 'application/json': { schema: { $ref: '#/components/schemas/AuthResponse' } } } },
          401: { description: 'Unauthorized' }
        }
      }
    },
    '/api/Auth/logout': {
      post: {
        summary: 'Logout',
        responses: {
          200: { description: 'OK' }
        }
      }
    },
    '/api/Coin/popular': {
      get: {
        summary: 'Get popular coins',
        security: [{ bearerAuth: [] }],
        responses: {
          200: {
            description: 'OK',
            content: { 'application/json': { schema: { type: 'array', items: { $ref: '#/components/schemas/Coin' } } } }
          }
        }
      }
    },
    '/api/Coin/search': {
      get: {
        summary: 'Search symbols',
        security: [{ bearerAuth: [] }],
        parameters: [
          { name: 'keyword', in: 'query', required: true, schema: { type: 'string' } }
        ],
        responses: {
          200: { description: 'OK', content: { 'application/json': { schema: { type: 'array', items: { type: 'string' } } } } },
          400: { description: 'Bad Request' }
        }
      }
    },
    '/api/Coin/history/{symbol}': {
      get: {
        summary: 'Get price history',
        security: [{ bearerAuth: [] }],
        parameters: [
          { name: 'symbol', in: 'path', required: true, schema: { type: 'string' } },
          { name: 'limit', in: 'query', required: false, schema: { type: 'integer', default: 100 } }
        ],
        responses: {
          200: { description: 'OK', content: { 'application/json': { schema: { type: 'array', items: { $ref: '#/components/schemas/CryptoPrice' } } } } }
        }
      }
    },
    '/api/Coin/mywatchlist': {
      get: {
        summary: 'Get user watchlist',
        security: [{ bearerAuth: [] }],
        responses: {
          200: { description: 'OK', content: { 'application/json': { schema: { type: 'array', items: { $ref: '#/components/schemas/WatchlistItem' } } } } },
          401: { description: 'Unauthorized' }
        }
      }
    },
    '/api/Coin/mywatchlist/add': {
      post: {
        summary: 'Add to watchlist',
        security: [{ bearerAuth: [] }],
        parameters: [
          { name: 'symbol', in: 'query', required: true, schema: { type: 'string' } }
        ],
        responses: {
          200: { description: 'OK' },
          400: { description: 'Bad Request' },
          401: { description: 'Unauthorized' },
          404: { description: 'Not Found' }
        }
      }
    },
    '/api/Coin/mywatchlist/remove': {
      delete: {
        summary: 'Remove from watchlist',
        security: [{ bearerAuth: [] }],
        parameters: [
          { name: 'symbol', in: 'query', required: true, schema: { type: 'string' } }
        ],
        responses: {
          200: { description: 'OK' },
          400: { description: 'Bad Request' },
          401: { description: 'Unauthorized' },
          404: { description: 'Not Found' }
        }
      }
    },
    '/api/Insight/getdailyinsights': {
      get: {
        summary: 'Get latest daily insight',
        security: [{ bearerAuth: [] }],
        responses: {
          200: { description: 'OK', content: { 'application/json': { schema: { $ref: '#/components/schemas/DailyInsight' } } } },
          404: { description: 'Not Found' }
        }
      }
    },
    '/api/Insight/getmarketregime': {
      get: {
        summary: 'Get latest market regime',
        security: [{ bearerAuth: [] }],
        responses: {
          200: { description: 'OK', content: { 'application/json': { schema: { $ref: '#/components/schemas/MarketRegime' } } } },
          404: { description: 'Not Found' }
        }
      }
    },
    '/api/Recommendation/getrecommendations': {
      get: {
        summary: 'Get recommendations',
        security: [{ bearerAuth: [] }],
        parameters: [
          { name: 'riskProfile', in: 'query', required: false, schema: { type: 'string' } },
          { name: 'since', in: 'query', required: false, schema: { type: 'string', format: 'date-time' } },
          { name: 'watchlist', in: 'query', required: false, schema: { type: 'boolean', default: false } }
        ],
        responses: {
          200: { description: 'OK', content: { 'application/json': { schema: { type: 'array', items: { $ref: '#/components/schemas/Recommendation' } } } } }
        }
      }
    },
    '/api/Recommendation/getsignals': {
      get: {
        summary: 'Get latest signals',
        security: [{ bearerAuth: [] }],
        parameters: [
          { name: 'since', in: 'query', required: false, schema: { type: 'string', format: 'date-time' } }
        ],
        responses: {
          200: { description: 'OK', content: { 'application/json': { schema: { type: 'array', items: { $ref: '#/components/schemas/SmartSignal' } } } } }
        }
      }
    },
    '/api/Recommendation/getsignalhistory': {
      get: {
        summary: 'Get signal history',
        security: [{ bearerAuth: [] }],
        parameters: [
          { name: 'symbol', in: 'query', required: true, schema: { type: 'string' } },
          { name: 'since', in: 'query', required: false, schema: { type: 'string', format: 'date-time' } }
        ],
        responses: {
          200: { description: 'OK', content: { 'application/json': { schema: { type: 'array', items: { $ref: '#/components/schemas/SmartSignal' } } } } },
          400: { description: 'Bad Request' }
        }
      }
    },
    '/api/Recommendation/getcoinanomalies': {
      get: {
        summary: 'Get coin anomalies',
        security: [{ bearerAuth: [] }],
        parameters: [
          { name: 'since', in: 'query', required: false, schema: { type: 'string', format: 'date-time' } }
        ],
        responses: {
          200: { description: 'OK', content: { 'application/json': { schema: { type: 'array', items: { $ref: '#/components/schemas/CoinAnomaly' } } } } }
        }
      }
    }
  }
};
