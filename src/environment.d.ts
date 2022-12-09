declare global {
  namespace NodeJS {
    interface ProcessEnv {
      DATABASE_HOST: string,
      DATABASE_PORT: string,
      DATABASE_USER: string,
      DATABASE_PASSWORD: string,
      DATABASE_NAME: string
      SCOREBOT_LEADERBOARD_URL: string,
      SCOREBOT_PORT: string
      SCOREBOT_USE_SSL: string
      ENV: 'test' | 'dev' | 'prod';
    }
  }
}

export {};
