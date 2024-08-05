#!/bin/bash
# wait-for-it.sh

host="$1"
shift
port="$1"
shift
cmd="$@"

until nc -z -v -w30 $host $port
do
  echo "Waiting for database connection at $host:$port..."
  sleep 1
done

>&2 echo "Database is up - executing command"
exec $cmd
