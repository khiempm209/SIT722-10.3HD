terraform {
  required_providers {
    azurerm = {
      source  = "hashicorp/azurerm" #azure resource manager
      version = "~> 3.114.0"
    }
  }

  required_version = ">= 1.5.6"
}

provider "azurerm" {
  features {}
}
