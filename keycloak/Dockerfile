FROM quay.io/keycloak/keycloak:26.2.5

# Realm fest ins Image backen, statt zur Laufzeit zu mounten.
# Bind-Mounts einzelner Dateien sind in Portainer/Git-Stacks unzuverlässig
# (der Docker-Daemon sieht den Checkout-Pfad nicht -> leeres Verzeichnis).
COPY realm-export.json /opt/keycloak/data/import/realm-export.json
