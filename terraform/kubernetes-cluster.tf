resource "azurerm_kubernetes_cluster" "akc" {
  name                = var.kubernetes_cluster_name
  location            = var.location
  resource_group_name = data.azurerm_resource_group.deakin.name
  dns_prefix          = var.kubernetes_cluster_name

  default_node_pool {
    name       = var.kuberets_cluster_node_pool_name
    vm_size    = var.kuberets_cluster_node_pool_size
    node_count = var.kuberets_cluster_node_pool_count
  }

  identity {
    type = "SystemAssigned"
  }
}

