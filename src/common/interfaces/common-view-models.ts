export interface BreadcrumbItem {
  name: string
  url: string
}

export interface Breadcrumb extends BreadcrumbItem {
  isLast: boolean
}
