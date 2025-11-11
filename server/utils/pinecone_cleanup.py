from db_connections import get_pinecone_connector


def cleanup_pinecone():
    """
    Deletes all indexes from your Pinecone project.
    ⚠️ WARNING: This is irreversible — all stored vectors will be lost.
    """
    pc = get_pinecone_connector()
    indexes = pc.list_indexes().names()

    if not indexes:
        print("✅ No indexes found — nothing to delete.")
        return

    print(f"🗑️ Found {len(indexes)} indexes: {indexes}")
    for name in indexes:
        try:
            pc.delete_index(name)
            print(f"✅ Deleted index: {name}")
        except Exception as e:
            print(f"❌ Failed to delete {name}: {e}")

    print("🎯 All indexes cleaned up successfully.")


# cleanup_pinecone()
