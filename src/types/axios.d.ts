declare module 'axios' {
  export interface AxiosRequestConfig {
    noLoader?: boolean
  }

  export interface AxiosResponse<TData = unknown> {
    data: TData
    config: AxiosRequestConfig
  }

  export interface AxiosInstance {
    get<T, R = AxiosResponse<T>>(url: string, config?: AxiosRequestConfig): Promise<R>
  }
}

export {}
