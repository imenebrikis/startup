import { useTranslation } from "react-i18next";
import LegalLayout, { Section, Para, Bullets } from "../components/LegalLayout";

const MAIL = "darbeldar.dz@gmail.com";
const mailLinkStyle = { color: "#005B5B", fontWeight: 600, textDecoration: "underline" };

export default function Privacy() {
  const { i18n } = useTranslation();
  const en = i18n.language?.startsWith("en");

  return (
    <LegalLayout title={en ? "Privacy Policy" : "Politique de Confidentialité"}>
      {en ? (
        <>
          <Section>1. Data Collection</Section>
          <Para>
            As part of using Darbeldar, we collect the information necessary for the proper
            functioning of the service:
          </Para>
          <Bullets
            items={[
              "Profile information: First name, last name, email address, phone number.",
              "Home information: Address, photos, technical description, and amenities.",
              "Usage data: Messages exchanged through our internal messaging, history of exchange requests.",
            ]}
          />

          <Section>2. Use of Your Data</Section>
          <Para>Your data is used strictly to:</Para>
          <Bullets
            items={[
              "Create and manage your user account.",
              "Connect you with other members of the community.",
              "Send you notifications about your messages and exchange requests.",
              "Improve the security and overall experience on the platform.",
            ]}
          />

          <Section>3. Data Sharing and Protection</Section>
          <Para>
            Darbeldar undertakes never to sell your personal data to third parties or for advertising
            purposes. Your home details and profile are only visible to other registered members of
            the platform. Your exact email address and phone number are shared only after mutual
            confirmation of an exchange.
          </Para>
          <Para>
            All your data is stored securely, and access to the database is protected by strict
            security protocols.
          </Para>

          <Section>4. Your Rights</Section>
          <Para>
            You remain in control of your information. At any time, you have the right to view, modify,
            or permanently delete your profile and home information from your account settings. For any
            request to fully delete your account, you can contact us at{" "}
            <a href={`mailto:${MAIL}`} style={mailLinkStyle}>
              {MAIL}
            </a>
            .
          </Para>
        </>
      ) : (
        <>
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
            <a href={`mailto:${MAIL}`} style={mailLinkStyle}>
              {MAIL}
            </a>
            .
          </Para>
        </>
      )}
    </LegalLayout>
  );
}
