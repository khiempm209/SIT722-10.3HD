variable "location" {
  description = "the location of the Azure server"
  type        = string
  default     = "australiasoutheast"
}
variable "resoure_group_name" {
  type    = string
  default = "deakinuni"
}
variable "kubernetes_cluster_name" {
  type    = string
  default = "sit722pmkstaging"
}
variable "kuberets_cluster_node_pool_name" {
  type    = string
  default = "agentpool"
}
variable "kuberets_cluster_node_pool_size" {
  type    = string
  default = "Standard_D2s_v3"
}
variable "kuberets_cluster_node_pool_count" {
  type    = number
  default = 1
}
