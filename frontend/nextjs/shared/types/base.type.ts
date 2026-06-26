export interface Base extends BaseId, BaseDetail {}

export interface BaseId {
  id: string
}

export interface BaseDetail {
  createdAt: string
  createdBy: string
  modifiedAt: string
  modifiedBy: string
  deletedAt: string
}
