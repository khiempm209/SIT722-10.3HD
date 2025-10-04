import argparse
import json
import os
import sys
import logging
from datetime import datetime, timedelta
from typing import List, Optional

from azure.storage.blob import (
    BlobServiceClient,
    ContentSettings,
    generate_blob_sas,
    BlobSasPermissions,
)
from azure.core.exceptions import ResourceNotFoundError

from pymongo import MongoClient, errors
from pymongo.operations import InsertOne
from pymongo.errors import BulkWriteError

logging.basicConfig(
    level=logging.INFO,
    format="%(asctime)s - %(levelname)s - %(name)s - %(message)s",
    handlers=[logging.StreamHandler(sys.stdout)],
)
logger = logging.getLogger(__name__)
logging.getLogger("azure.core.pipeline.policies.http_logging_policy").setLevel(logging.WARNING)

AZURE_STORAGE_ACCOUNT_NAME = os.getenv("AZURE_STORAGE_ACCOUNT_NAME")
AZURE_STORAGE_ACCOUNT_KEY = os.getenv("AZURE_STORAGE_ACCOUNT_KEY")
AZURE_STORAGE_CONTAINER_NAME = os.getenv("AZURE_STORAGE_CONTAINER_NAME", "sit722pmk")
AZURE_SAS_TOKEN_EXPIRY_HOURS = int(os.getenv("AZURE_SAS_TOKEN_EXPIRY_HOURS", "24"))

mongo_connection = {'MONGO_HOST': os.getenv('MONGODB_HOST'),
                    'MONGO_PORT': 20722,
                    'DB_NAME': 'SIT722HD',
                    'COLLECTION_NAME': 'items',
                    'COLLECTION_LI_NAME': 'items_li',
                    'MONGO_APP_USER': os.getenv('MONGODB_APP_USER'),
                    'MONGO_APP_PASSWORD': os.getenv('MONGODB_APP_PASSWORD')}

blob_service_client: Optional[BlobServiceClient] = None

if AZURE_STORAGE_ACCOUNT_NAME and AZURE_STORAGE_ACCOUNT_KEY:
    try:
        account_url = f"https://{AZURE_STORAGE_ACCOUNT_NAME}.blob.core.windows.net"
        blob_service_client = BlobServiceClient(
            account_url=account_url, credential=AZURE_STORAGE_ACCOUNT_KEY
        )
        logger.info("Azure BlobServiceClient initialized.")

        try:
            container_client = blob_service_client.get_container_client(AZURE_STORAGE_CONTAINER_NAME)
            container_client.create_container()
            logger.info(f"Container '{AZURE_STORAGE_CONTAINER_NAME}' created.")
        except Exception as e:
            logger.info(
                f"Container '{AZURE_STORAGE_CONTAINER_NAME}' may already exist or could not be created: {e}"
            )

    except Exception as e:
        logger.critical(
            f"Failed to initialize Azure BlobServiceClient. Check AZURE_STORAGE_ACCOUNT_NAME/AZURE_STORAGE_ACCOUNT_KEY. Error: {e}",
            exc_info=True,
        )
        blob_service_client = None
else:
    logger.warning(
        "Azure credentials not found in environment. Set AZURE_STORAGE_ACCOUNT_NAME and AZURE_STORAGE_ACCOUNT_KEY to enable blob operations."
    )
    blob_service_client = None

def get_client(connection):
    # print(connection['MONGO_HOST'])
    client = MongoClient(connection['MONGO_HOST'], 
                         connection['MONGO_PORT'],
                         username=connection['MONGO_APP_USER'], password=connection['MONGO_APP_PASSWORD'], 
                         authSource=connection['DB_NAME'],
                         connectTimeoutMS=120000)

    return client

def bulk_insert_stream(list_items, connection, collection, batch_size=1000):
    try:
        client = get_client(connection)
    except:
        print("Cannot connect to the server")
        return -1 
    coll = client[connection['DB_NAME']][collection]
    ops = []
    total = 0
    for i, item in enumerate(list_items):
        ops.append(InsertOne(item))
        if i >= batch_size:
            try:
                #bulk write by batch
                res = coll.bulk_write(ops, ordered=False)
                total += res.inserted_count
            except BulkWriteError as bwe:
                print("BulkWriteError batch:", bwe.details)
                total += bwe.details.get("nInserted", 0)
            ops = []
    if ops:
        try:
            res = coll.bulk_write(ops, ordered=False)
            total += res.inserted_count
        except BulkWriteError as bwe:
            print("BulkWriteError final batch:", bwe.details)
            total += bwe.details.get("nInserted", 0)
    #create indexes
    
    client.close()
    print(f"Completed: {total}/{len(list_items)}")
    return 1

def initialize_database(connection, list_items, list_items_li):
    res = bulk_insert_stream(list_items, connection, collection=connection['COLLECTION_NAME'])
    if res == -1:
        return
    
    _ = bulk_insert_stream(list_items_li, connection, collection=connection['COLLECTION_LI_NAME'])
    client = get_client(connection)
    coll = client[connection['DB_NAME']][connection['COLLECTION_NAME']]
    coll_1 = client[connection['DB_NAME']][connection['COLLECTION_LI_NAME']]
    #create indexes
    text_indexes, weight_indexs = ['general_information', 'name', 'ingredients'], [10, 5, 2]
    coll.create_index([(field, "text") for field in text_indexes], name="multi_text_idx",
                        weights={field: weight_indexs[i] for i, field in enumerate(text_indexes)})
    coll.create_index([('categories', 1), ('brand', 1)], name=f"category_idx")
    coll.create_index([('brand', 1)], name=f"brand_idx")
    coll.create_index([('price.chemist_warehouse')], name=f"price_idx")
    coll.create_index([('avg_reviews')], name=f"avg_reviews_idx")
    coll.create_index([('count_reviews')], name=f"count_reviews_idx")

    coll_1.create_index([('name', 'text')], name=f"name_idx")
    client.close()

def download_json_list_from_blob(blob_name: str):
    if not blob_service_client:
        raise RuntimeError("Azure BlobServiceClient is not initialized. Check credentials.")

    container = AZURE_STORAGE_CONTAINER_NAME
    blob_client = blob_service_client.get_blob_client(container=container, blob=blob_name)

    try:
        logger.info(f"Downloading JSON blob '{blob_name}' from container '{container}'.")
        downloader = blob_client.download_blob()
        raw_bytes = downloader.readall()
        text = raw_bytes.decode("utf-8")
        data = json.loads(text)
        logger.info(f"Successfully downloaded and parsed JSON blob '{blob_name}'.")
        return data
    except ResourceNotFoundError:
        logger.error(f"Blob '{blob_name}' not found in container '{container}'.")
        raise
    except json.JSONDecodeError as e:
        logger.error(f"Failed to decode JSON from blob '{blob_name}': {e}", exc_info=True)
        raise
    except Exception as e:
        logger.error(f"Unexpected error downloading blob '{blob_name}': {e}", exc_info=True)
        raise



if __name__ == "__main__":
    # parser = argparse.ArgumentParser(formatter_class=argparse.RawTextHelpFormatter)
    # parser.add_argument('--mongodb-host', type=str, required=True)
    # parser.add_argument('--mongodb-port', type=str, required=True)
    # parser.add_argument('--db-name', type=str, required=True)
    # parser.add_argument('--collection-item-name', type=str, required=True)
    # parser.add_argument('--collection-item-li-name', type=str, required=True)
    # parser.add_argument('--mongodb-app-user', type=str, required=True)
    # parser.add_argument('--mongodb-app-password', type=str, required=True)
    # args = parser.parse_args()
    # mongo_connection = {
    #     'MONGO_HOST': args.mongodb_host,
    #     'MONGO_PORT': int(args.mongodb_port),
    #     'DB_NAME': args.db_name,
    #     'COLLECTION_NAME': args.collection_item_name,
    #     'COLLECTION_LI_NAME': args.collection_item_li_name,
    #     'MONGO_APP_USER': args.mongodb_app_user,
    #     'MONGO_APP_PASSWORD': args.mongodb_app_password
    # }
    blob_name = "seed-data/items_detail.json"
    list_items = download_json_list_from_blob(blob_name)
    list_items_li = [{'name': item['name']} for item in list_items]
    initialize_database(mongo_connection, list_items, list_items_li)


