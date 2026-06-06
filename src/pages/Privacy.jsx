import LegalLayout, { Section, Para, Bullets } from "../components/LegalLayout";

export default function Privacy() {
  return (
    <LegalLayout title="Politique de Confidentialité">
      <Section>1. Collecte des Données</Section>
      <Para>
        Dans le cadre de l'utilisation de Darbeldar, nous collectons les informations nécessaires au
        bon fonctionnement du service :
      </Para>
      <Bullets
        items={[
          "Informations de profil : Nom, prénom, adresse e-mail, numéro de téléphone.",
          "Informations sur le logement : Adresse, photos, description technique et commodités.",
          "Données d'utilisation : Messages échangés via notre messagerie interne, historique des demandes d'échange.",
        ]}
      />

      <Section>2. Utilisation de vos Données</Section>
      <Para>Vos données sont strictement utilisées pour :</Para>
      <Bullets
        items={[
          "Créer et gérer votre compte utilisateur.",
          "Vous mettre en relation avec d'autres membres de la communauté.",
          "Vous envoyer des notifications concernant vos messages et demandes d'échange.",
          "Améliorer la sécurité et l'expérience globale sur la plateforme.",
        ]}
      />

      <Section>3. Partage et Protection des Données</Section>
      <Para>
        Darbeldar s'engage à ne jamais vendre vos données personnelles à des tiers ou à des fins
        publicitaires. Les détails de votre logement et votre profil ne sont visibles que par les
        autres membres inscrits de la plateforme. Votre adresse e-mail exacte et votre numéro de
        téléphone ne sont partagés qu'après confirmation mutuelle d'un échange.
      </Para>
      <Para>
        Toutes vos données sont stockées de manière sécurisée et les accès à la base de données sont
        protégés par des protocoles stricts de sécurité.
      </Para>

      <Section>4. Vos Droits</Section>
      <Para>
        Vous restez maître de vos informations. À tout moment, vous avez le droit de consulter,
        modifier ou supprimer définitivement les informations de votre profil et de votre logement
        depuis les paramètres de votre compte. Pour toute demande de suppression totale de compte,
        vous pouvez nous contacter à{" "}
        <a href="mailto:darbeldar.dz@gmail.com" style={{ color: "#005B5B", fontWeight: 600, textDecoration: "underline" }}>
          darbeldar.dz@gmail.com
        </a>
        .
      </Para>
    </LegalLayout>
  );
}
