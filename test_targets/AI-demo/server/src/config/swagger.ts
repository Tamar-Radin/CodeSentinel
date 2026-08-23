import swaggerJsdoc from 'swagger-jsdoc';
import path from 'path';

const options: swaggerJsdoc.Options = {
  definition: {
    openapi: '3.0.0',
    info: {
      title: 'TechStore API',
      version: '1.0.0',
      description: 'API documentation for TechStore backend',
    },
    servers: [
      {
        url: 'http://localhost:3000',
        description: 'Development server',
      },
    ],
    components: {
      schemas: {
        TodaysOrdersCountResponse: {
          type: 'object',
          properties: {
            todaysOrdersCount: {
              type: 'integer',
              description: 'מספר ההזמנות של היום (ללא cancelled/returned)',
              example: 42,
            },
          },
        },
        RevenueByCategory: {
          type: 'object',
          properties: {
            category: { type: 'string', example: 'אוזניות' },
            totalRevenue: { type: 'number', example: 12500 },
            totalProductsSold: { type: 'integer', example: 8 },
          },
        },
        TopCustomer: {
          type: 'object',
          properties: {
            customerId: { type: 'string', example: '664a1b2c3d4e5f6a7b8c9d0e' },
            name: { type: 'string', example: 'יוסי כהן' },
            email: { type: 'string', example: 'yossi.cohen@gmail.com' },
            totalSpent: { type: 'number', example: 8500 },
            orderCount: { type: 'integer', example: 3 },
            avgOrderValue: { type: 'number', example: 2833.33 },
          },
        },
        WeeklyTrend: {
          type: 'object',
          properties: {
            week: { type: 'string', example: '2026-W10' },
            orderCount: { type: 'integer', example: 15 },
            revenue: { type: 'number', example: 22500 },
          },
        },
        CustomerSegment: {
          type: 'object',
          properties: {
            segment: { type: 'string', example: 'Gold' },
            count: { type: 'integer', example: 5 },
            minSpent: { type: 'number', example: 2000 },
            maxSpent: { type: 'number', example: 4999 },
          },
        },
        SalesAnalyticsResponse: {
          type: 'object',
          properties: {
            revenueByCategory: {
              type: 'array',
              items: { $ref: '#/components/schemas/RevenueByCategory' },
            },
            topCustomers: {
              type: 'array',
              items: { $ref: '#/components/schemas/TopCustomer' },
            },
            weeklyTrend: {
              type: 'array',
              items: { $ref: '#/components/schemas/WeeklyTrend' },
            },
            customerSegmentation: {
              type: 'array',
              items: { $ref: '#/components/schemas/CustomerSegment' },
            },
          },
        },
        ErrorResponse: {
          type: 'object',
          properties: {
            error: {
              type: 'string',
              example: 'Internal server error',
            },
          },
        },
      },
    },
  },
  // סריקת כל קבצי ה-JS וה-TS בתוך routes ו-controllers לאיתור @swagger comments
  apis: [
    path.join(__dirname, '../routes/*.js'),
    path.join(__dirname, '../routes/*.ts'),
    path.join(__dirname, '../controllers/*.js'),
    path.join(__dirname, '../controllers/*.ts'),
  ],
};

export const swaggerSpec = swaggerJsdoc(options);
