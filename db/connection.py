import os

import psycopg
from dotenv import load_dotenv

load_dotenv()


def get_conn():
    return psycopg.connect(os.environ["DATABASE_URL"])

def get_readonly_conn():
    return psycopg.connect(os.environ["READONLY_DATABASE_URL"])
