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

#   depends_on = [ azurerm_container_registry.acr ]
}

# resource "azurerm_role_assignment" "role_assignment" {
#   principal_id                     = azurerm_kubernetes_cluster.akc.kubelet_identity[0].object_id
#   role_definition_name             = "AcrPull"
#   scope                            = azurerm_container_registry.acr.id
#   skip_service_principal_aad_check = true

#   depends_on = [
#     azurerm_kubernetes_cluster.akc,
#     azurerm_container_registry.acr,
#   ]
# }
