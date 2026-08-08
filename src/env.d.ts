declare namespace NodeJS {
  interface ProcessEnv {
    /** Base URL of the CRM backend, e.g. `http://localhost:8000/api/v1`. */
    readonly PUBLIC_API_BASE_URL: string;
  }
}
