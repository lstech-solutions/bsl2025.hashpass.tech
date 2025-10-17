SET session_replication_role = replica;

--
-- PostgreSQL database dump
--

\restrict fpGAz0iKSh9nTde6IaE9c9NvAdntzXp35leg9TGVh7xwiPMtTStwMdlnouvAUaG

-- Dumped from database version 17.6
-- Dumped by pg_dump version 17.6

SET statement_timeout = 0;
SET lock_timeout = 0;
SET idle_in_transaction_session_timeout = 0;
SET transaction_timeout = 0;
SET client_encoding = 'UTF8';
SET standard_conforming_strings = on;
SELECT pg_catalog.set_config('search_path', '', false);
SET check_function_bodies = false;
SET xmloption = content;
SET client_min_messages = warning;
SET row_security = off;

--
-- Data for Name: meeting_requests; Type: TABLE DATA; Schema: public; Owner: postgres
--



--
-- Data for Name: boost_transactions; Type: TABLE DATA; Schema: public; Owner: postgres
--



--
-- Data for Name: bsl_audit; Type: TABLE DATA; Schema: public; Owner: postgres
--



--
-- Data for Name: bsl_speakers; Type: TABLE DATA; Schema: public; Owner: postgres
--

INSERT INTO "public"."bsl_speakers" ("id", "name", "title", "linkedin", "bio", "imageurl", "tags", "availability", "created_at") VALUES
	('550e8400-e29b-41d4-a716-446655440001', 'Claudia Restrepo', 'Rectora', NULL, 'Rectora at EAFIT', 'https://blockchainsummit.la/wp-content/uploads/2025/09/foto-claudia-restrepo.png', '{}', '[]', '2025-10-15 09:43:22.330207+00'),
	('550e8400-e29b-41d4-a716-446655440002', 'Leonardo Villar', 'Gerente General', NULL, 'Gerente General at Banco de la República', 'https://blockchainsummit.la/wp-content/uploads/2025/09/Diseno-sin-titulo-2.png', '{}', '[]', '2025-10-15 09:43:22.645011+00'),
	('550e8400-e29b-41d4-a716-446655440003', 'César Ferrari', 'Superintendente Financiero de Colombia', NULL, 'Superintendente Financiero de Colombia at Superintendencia Financiera', 'https://blockchainsummit.la/wp-content/uploads/2025/09/foto-cesar-ferrari-1.png', '{}', '[]', '2025-10-15 09:43:22.852913+00'),
	('550e8400-e29b-41d4-a716-446655440004', 'Alberto Naudon', 'Consejero', NULL, 'Consejero at Banco Central de Chile', 'https://blockchainsummit.la/wp-content/uploads/2025/09/foto-alberto-naudon.png', '{}', '[]', '2025-10-15 09:43:23.015031+00'),
	('550e8400-e29b-41d4-a716-446655440005', 'José Outumuro', 'Director Institutional sales EMEA', NULL, 'Director Institutional sales EMEA at Crypto.com', 'https://blockchainsummit.la/wp-content/uploads/2025/09/foto-jose-outomouro.png', '{}', '[]', '2025-10-15 09:43:23.169277+00'),
	('550e8400-e29b-41d4-a716-446655440006', 'Efraín Barraza', 'Regional Expansion Manager - Latam', NULL, 'Regional Expansion Manager - Latam at Tether', 'https://blockchainsummit.la/wp-content/uploads/2025/09/foto-efrain-barraza-1.png', '{}', '[]', '2025-10-15 09:43:23.334481+00'),
	('550e8400-e29b-41d4-a716-446655440007', 'Sandra Meza', 'Vicepresidente Control Interno y Cumplimiento', NULL, 'Vicepresidente Control Interno y Cumplimiento at BBVA', 'https://blockchainsummit.la/wp-content/uploads/2025/09/foto-andra-meza.png', '{}', '[]', '2025-10-15 09:43:23.498825+00'),
	('550e8400-e29b-41d4-a716-446655440008', 'Sebastián Durán', 'Subdirector de Regulación', NULL, 'Subdirector de Regulación at Superintendencia Financiera de Colombia', 'https://blockchainsummit.la/wp-content/uploads/2025/10/foto-sebastian-duran.png', '{}', '[]', '2025-10-15 09:43:23.65373+00'),
	('550e8400-e29b-41d4-a716-446655440009', 'Rocelo Lopes', 'CEO', NULL, 'CEO at SmartPay', 'https://blockchainsummit.la/wp-content/uploads/2025/09/foto-rocelo-3.png', '{}', '[]', '2025-10-15 09:43:23.824399+00'),
	('550e8400-e29b-41d4-a716-446655440010', 'Ana Garcés', 'Chief Compliance Officer', NULL, 'Chief Compliance Officer at Banco BHD', 'https://blockchainsummit.la/wp-content/uploads/2025/09/foto-ana-garces.png', '{}', '[]', '2025-10-15 09:43:23.98039+00'),
	('550e8400-e29b-41d4-a716-446655440011', 'Juan Carlos Reyes', 'Presidente', NULL, 'Presidente at Comisión Nacional de Activos Digitales (CNAD) El Salvador', 'https://blockchainsummit.la/wp-content/uploads/2025/09/foto-juan-carlos-reyes.png', '{}', '[]', '2025-10-15 09:43:24.135438+00'),
	('550e8400-e29b-41d4-a716-446655440012', 'Gabriel Santos', 'Presidente Ejecutivo', NULL, 'Presidente Ejecutivo at Colombia FinTech', 'https://blockchainsummit.la/wp-content/uploads/2025/10/foto-gabriel-santos.png', '{}', '[]', '2025-10-15 09:43:24.288862+00'),
	('550e8400-e29b-41d4-a716-446655440013', 'César Tamayo', 'Dean, School of Finance, Economics & Government', NULL, 'Dean, School of Finance, Economics & Government at Universidad EAFIT', 'https://blockchainsummit.la/wp-content/uploads/2025/09/foto-cesar-tamayo-1.png', '{}', '[]', '2025-10-15 09:43:24.445092+00'),
	('550e8400-e29b-41d4-a716-446655440014', 'Daniel Mangabeira', 'Vice President Strategy & Policy, Brazil & Latin America', NULL, 'Vice President Strategy & Policy, Brazil & Latin America at Circle', 'https://blockchainsummit.la/wp-content/uploads/2025/09/foto-daniel-mangabeira.png', '{}', '[]', '2025-10-15 09:43:24.612271+00'),
	('550e8400-e29b-41d4-a716-446655440015', 'Juan Pablo Rodríguez', 'Socio de rics management', NULL, 'Socio de rics management at Colombia y Guatemala', 'https://blockchainsummit.la/wp-content/uploads/2025/09/foto-juan-pablo-gutierrez.png', '{}', '[]', '2025-10-15 09:43:24.785269+00'),
	('550e8400-e29b-41d4-a716-446655440016', 'Willian Santos', 'Gerente de Compliance - Oficial de Cumplimiento', NULL, 'Gerente de Compliance - Oficial de Cumplimiento at Banco W', 'https://blockchainsummit.la/wp-content/uploads/2025/09/foto-william-.png', '{}', '[]', '2025-10-15 09:43:24.936535+00'),
	('550e8400-e29b-41d4-a716-446655440017', 'Rocío Alvarez-Ossorio', 'Founder & CEO', NULL, 'Founder & CEO at Hator', 'https://blockchainsummit.la/wp-content/uploads/2025/09/foto-rocio-alvarez-1.png', '{}', '[]', '2025-10-15 09:43:25.088522+00'),
	('550e8400-e29b-41d4-a716-446655440018', 'Steffen Härting', 'Senior Manager', NULL, 'Senior Manager at Deloitte: Crypto Asset Markets', 'https://blockchainsummit.la/wp-content/uploads/2025/09/Foto-Steffen-Harting.png', '{}', '[]', '2025-10-15 09:43:25.239272+00'),
	('550e8400-e29b-41d4-a716-446655440019', 'Diego Fernández', 'Gerente Corporativo de Innovación', NULL, 'Gerente Corporativo de Innovación at nuam', 'https://blockchainsummit.la/wp-content/uploads/2025/10/foto-diego-fernandez-2.png', '{}', '[]', '2025-10-15 09:43:25.401066+00'),
	('550e8400-e29b-41d4-a716-446655440020', 'Andres Florido', 'Senior Manager - Blockchain & AI Assurance', NULL, 'Senior Manager - Blockchain & AI Assurance at Deloitte', 'https://blockchainsummit.la/wp-content/uploads/2025/09/foto-andres-florido.png', '{}', '[]', '2025-10-15 09:43:25.549037+00'),
	('550e8400-e29b-41d4-a716-446655440021', 'Liz Bejarano', 'Directora Financiera y de Riesgo', NULL, 'Directora Financiera y de Riesgo at Asobancaria', 'https://blockchainsummit.la/wp-content/uploads/2025/10/foto-liz-bejarano.png', '{}', '[]', '2025-10-15 09:43:25.701846+00'),
	('550e8400-e29b-41d4-a716-446655440022', 'Andrés Meneses', 'Founder', NULL, 'Founder at Orbyt X', 'https://blockchainsummit.la/wp-content/uploads/2025/09/foto-andres-meneses-1.png', '{}', '[]', '2025-10-15 09:43:25.854737+00'),
	('550e8400-e29b-41d4-a716-446655440023', 'Luther Maday', 'Head of Payments', NULL, 'Head of Payments at Algorand Foundation', 'https://blockchainsummit.la/wp-content/uploads/2025/09/foto-luther-1.png', '{}', '[]', '2025-10-15 09:43:26.00721+00'),
	('550e8400-e29b-41d4-a716-446655440024', 'Rafael Teruszkin', 'Head Latam', NULL, 'Head Latam at Bitpanda Technology Solutions', 'https://blockchainsummit.la/wp-content/uploads/2025/09/Rafael-Teruszkin.png', '{}', '[]', '2025-10-15 09:43:26.155491+00'),
	('550e8400-e29b-41d4-a716-446655440025', 'Albi Rodríguez', 'Senior Web3 & DLT Consultant', NULL, 'Senior Web3 & DLT Consultant at Independent', 'https://blockchainsummit.la/wp-content/uploads/2025/09/foto-albi.png', '{}', '[]', '2025-10-15 09:43:26.30565+00'),
	('26', 'Judith Vergara', 'Director of Executive Education', NULL, 'Director of Executive Education at Universidad EAFIT', 'https://blockchainsummit.la/wp-content/uploads/2025/09/foto-judith.png', '{}', '[]', '2025-10-15 09:43:26.450903+00'),
	('27', 'William Durán', 'CO-CEO & Founder', NULL, 'CO-CEO & Founder at Minteo', 'https://blockchainsummit.la/wp-content/uploads/2025/09/foto-william-duran-2.png', '{}', '[]', '2025-10-15 09:43:26.593938+00'),
	('28', 'Daniel Aguilar', 'Co Founder & COO', NULL, 'Co Founder & COO at Trokera', 'https://blockchainsummit.la/wp-content/uploads/2025/09/foto-dani-aguilar.png', '{}', '[]', '2025-10-15 09:43:26.739386+00'),
	('29', 'Rafael Gago', 'Director Comercial, Gerencia de Ideación e Incubación', NULL, 'Director Comercial, Gerencia de Ideación e Incubación at nuam exchange', 'https://blockchainsummit.la/wp-content/uploads/2025/09/foto-rafael-gago-1.png', '{}', '[]', '2025-10-15 09:43:26.882206+00'),
	('30', 'Pablo Santos', 'Founder & CEO', NULL, 'Founder & CEO at Finaktiva', 'https://blockchainsummit.la/wp-content/uploads/2025/09/foto-pablo-santos.png', '{}', '[]', '2025-10-15 09:43:27.026667+00'),
	('31', 'Ana María Zuluaga', 'Head of Open Finance Office', NULL, 'Head of Open Finance Office at Grupo Aval', 'https://blockchainsummit.la/wp-content/uploads/2025/09/foto-ana-maria-zuluaga.png', '{}', '[]', '2025-10-15 09:43:27.172438+00'),
	('32', 'Alireza Siadat', 'Head of Strategy and Policy', NULL, 'Head of Strategy and Policy at 1inch', 'https://blockchainsummit.la/wp-content/uploads/2025/09/foto-Alireza-Siadat.png', '{}', '[]', '2025-10-15 09:43:27.319649+00'),
	('34', 'Juan Pablo Salazar', 'Head of Legal, Regulatory Affairs y Compliance', NULL, 'Head of Legal, Regulatory Affairs y Compliance at Ripio USA y Colombia', 'https://blockchainsummit.la/wp-content/uploads/2025/09/foto-Juan-Pablo-Salazar.png', '{}', '[]', '2025-10-15 09:43:27.616758+00'),
	('36', 'Marcos Carpio', 'Co-Founder & CFO', NULL, 'Co-Founder & CFO at Tokelab', 'https://blockchainsummit.la/wp-content/uploads/2025/09/foto-marcos-carpio.png', '{}', '[]', '2025-10-15 09:43:27.909304+00'),
	('38', 'Santiago Mejía', 'Chief Sales Officer', NULL, 'Chief Sales Officer at Lulo bank', 'https://blockchainsummit.la/wp-content/uploads/2025/09/foto-santiago-mejia.png', '{}', '[]', '2025-10-15 09:43:28.210763+00'),
	('40', 'Stephanie Sánchez', 'Asociada', NULL, 'Asociada at Fayca', 'https://blockchainsummit.la/wp-content/uploads/2025/09/foto-Stephanie-Sanchez.png', '{}', '[]', '2025-10-15 09:43:28.509408+00'),
	('42', 'Mónica Arellano', 'Managing Director - Stablecoins', NULL, 'Managing Director - Stablecoins at Anchorage', 'https://blockchainsummit.la/wp-content/uploads/2025/10/foto-monica-arellano.png', '{}', '[]', '2025-10-15 09:43:28.803493+00'),
	('44', 'Daniel Marulanda', 'Co Founder & CEO', NULL, 'Co Founder & CEO at Trokera', 'https://blockchainsummit.la/wp-content/uploads/2025/09/foto-Daniel-Marulanda.png', '{}', '[]', '2025-10-15 09:43:29.103388+00'),
	('46', 'David Yao', 'Principal', NULL, 'Principal at LBanks Labs', 'https://blockchainsummit.la/wp-content/uploads/2025/09/foto-david-yao-1.png', '{}', '[]', '2025-10-15 09:43:29.402251+00'),
	('48', 'Kieve Huffman', 'Founder and Chief Revenue Officer', NULL, 'Founder and Chief Revenue Officer at Engager', 'https://blockchainsummit.la/wp-content/uploads/2025/09/foto-kieve-1.png', '{}', '[]', '2025-10-15 09:43:29.690951+00'),
	('50', 'Karol Benavides', 'Regional Head – LATAM Partnerships & Strategy', NULL, 'Regional Head – LATAM Partnerships & Strategy at Fiskil', 'https://blockchainsummit.la/wp-content/uploads/2025/09/foto-karol-benavides.png', '{}', '[]', '2025-10-15 09:43:29.981357+00'),
	('52', 'José Manuel Souto', 'Consultor Internacional en Compliance y Criptoactivos', NULL, 'Consultor Internacional en Compliance y Criptoactivos at Grupo Vishab y PRIUS Consulting', 'https://blockchainsummit.la/wp-content/uploads/2025/09/foto-jose-manuel-souto.png', '{}', '[]', '2025-10-15 09:43:30.267353+00'),
	('54', 'Fernando Quirós', 'Managing Editor', NULL, 'Managing Editor at Cointelegraph en Español', 'https://blockchainsummit.la/wp-content/uploads/2025/09/fernando-quiros.png', '{}', '[]', '2025-10-15 09:43:30.553601+00'),
	('56', 'Edward Calderón', 'CEO', NULL, 'CEO at HashPass', 'https://blockchainsummit.la/wp-content/uploads/2025/09/foto-edward-calderon.png', '{}', '[]', '2025-10-15 09:43:30.844114+00'),
	('58', 'Ed Marquez', 'Head of Developer Relations', NULL, 'Head of Developer Relations at Hashgraph', 'https://blockchainsummit.la/wp-content/uploads/2025/09/foto-ed-marquez.png', '{}', '[]', '2025-10-15 09:43:31.140426+00'),
	('60', 'Paula Bermúdez', 'Abogada - Founder & CEO', NULL, 'Abogada - Founder & CEO at Digitalaw', 'https://blockchainsummit.la/wp-content/uploads/2025/09/foto-paula-vermudez.png', '{}', '[]', '2025-10-15 09:43:31.438295+00'),
	('62', 'Mireya Acosta', 'Co founder', NULL, 'Co founder at ColocaPayments', 'https://blockchainsummit.la/wp-content/uploads/2025/10/foto-mireya-acosta.png', '{}', '[]', '2025-10-15 09:43:31.73401+00'),
	('64', 'Camilo Serna', 'Head of Product', NULL, 'Head of Product at Kravata', 'https://blockchainsummit.la/wp-content/uploads/2025/10/foto-camilo-serna.png', '{}', '[]', '2025-10-15 09:43:32.021771+00'),
	('66', 'Sebastián Ramírez', 'Developer', NULL, 'Developer at TuCOP', 'https://blockchainsummit.la/wp-content/uploads/2025/10/foto-sebastian-ramirez.png', '{}', '[]', '2025-10-15 09:43:32.30955+00'),
	('68', 'Oscar Moratto', 'Director General', NULL, 'Director General at Beyond Risk SAS', 'https://blockchainsummit.la/wp-content/uploads/2025/10/foto-Oscar-Moratto.png', '{}', '[]', '2025-10-15 09:43:32.606204+00'),
	('33', 'Omar Castelblanco', 'Co Founder & CEO', NULL, 'Co Founder & CEO at Relámpago Payments', 'https://blockchainsummit.la/wp-content/uploads/2025/09/foto-Omar-Castelblanco-1.png', '{}', '[]', '2025-10-15 09:43:27.467968+00'),
	('35', 'Pedro Gutiérrez', 'Head of Partnerships', NULL, 'Head of Partnerships at LNET', 'https://blockchainsummit.la/wp-content/uploads/2025/09/foto-pedro-gutierrez.png', '{}', '[]', '2025-10-15 09:43:27.766099+00'),
	('37', 'Nathaly Diniz', 'Chief Revenue Officer', NULL, 'Chief Revenue Officer at Lumx', 'https://blockchainsummit.la/wp-content/uploads/2025/09/foto-Nathaly-Diniz.png', '{}', '[]', '2025-10-15 09:43:28.056516+00'),
	('39', 'Andrés González', 'Co Founder & CEO', NULL, 'Co Founder & CEO at indahouse', 'https://blockchainsummit.la/wp-content/uploads/2025/09/foto-andres-gonzalez-1.png', '{}', '[]', '2025-10-15 09:43:28.360717+00'),
	('41', 'Albert Prat', 'Fundador', NULL, 'Fundador at Beself Brands', 'https://blockchainsummit.la/wp-content/uploads/2025/09/Foto-Albert-Prat.png', '{}', '[]', '2025-10-15 09:43:28.653321+00'),
	('43', 'Camilo Suárez', 'Co Founder & CEO', NULL, 'Co Founder & CEO at Vurelo', 'https://blockchainsummit.la/wp-content/uploads/2025/09/camilo-suarez.png', '{}', '[]', '2025-10-15 09:43:28.956891+00'),
	('45', 'Carlos Salinas', 'Head of Digital Assets', NULL, 'Head of Digital Assets at Mora Banc', 'https://blockchainsummit.la/wp-content/uploads/2025/09/foto-carlos-salina-1.png', '{}', '[]', '2025-10-15 09:43:29.251373+00'),
	('47', 'María Fernanda Marín', 'Compliance Officer', NULL, 'Compliance Officer at DJIRO', 'https://blockchainsummit.la/wp-content/uploads/2025/09/foto-maria-fernanda-marin.png', '{}', '[]', '2025-10-15 09:43:29.548013+00'),
	('49', 'Matias Marmisolle', 'Co Founder & CEO', NULL, 'Co Founder & CEO at Anzi Finance', 'https://blockchainsummit.la/wp-content/uploads/2025/09/foto-matias-marmisolle.png', '{}', '[]', '2025-10-15 09:43:29.840343+00'),
	('51', 'Camilo Romero', 'Co Fundador y CEO', NULL, 'Co Fundador y CEO at Spyral Labs', 'https://blockchainsummit.la/wp-content/uploads/2025/09/foto-camilo-romero.png', '{}', '[]', '2025-10-15 09:43:30.122731+00'),
	('53', 'Edison Montoya', 'Director', NULL, 'Director at Finhub EAFIT', 'https://blockchainsummit.la/wp-content/uploads/2025/09/foto-edison.png', '{}', '[]', '2025-10-15 09:43:30.410917+00'),
	('55', 'Mariangel García', 'Co-Founder', NULL, 'Co-Founder at Women In Investment Network', 'https://blockchainsummit.la/wp-content/uploads/2025/09/foto-mariangel.png', '{}', '[]', '2025-10-15 09:43:30.701379+00'),
	('57', 'Roberto Darrigrandi', 'Socio', NULL, 'Socio at Altadirección Capital Latam', 'https://blockchainsummit.la/wp-content/uploads/2025/09/foto-roberto-darrigrandi.png', '{}', '[]', '2025-10-15 09:43:30.99611+00'),
	('59', 'Diego Osuna', 'CEO y Co Founder', NULL, 'CEO y Co Founder at MonaBit', 'https://blockchainsummit.la/wp-content/uploads/2025/10/foto-Diego-Osuna.png', '{}', '[]', '2025-10-15 09:43:31.285757+00'),
	('61', 'Gerardo Lagos', 'Co-Founder', NULL, 'Co-Founder at ObsidiaLab', 'https://blockchainsummit.la/wp-content/uploads/2025/07/foto-gerardo-lagos.png', '{}', '[]', '2025-10-15 09:43:31.587949+00'),
	('63', '0xj4an', 'Advisor', NULL, 'Advisor at Celo Colombia', 'https://blockchainsummit.la/wp-content/uploads/2025/10/foto-0xj4an.png', '{}', '[]', '2025-10-15 09:43:31.876901+00'),
	('65', 'Michelle Arguelles', 'CEO', NULL, 'CEO at M.A Global Accounting', 'https://blockchainsummit.la/wp-content/uploads/2025/10/foto-michelle-arguelles.png', '{}', '[]', '2025-10-15 09:43:32.168963+00'),
	('67', 'Ximena Monclou', 'Abogada y Contadora', NULL, 'Abogada y Contadora at Celo Colombia', 'https://blockchainsummit.la/wp-content/uploads/2025/10/foto-ximena-monclou.png', '{}', '[]', '2025-10-15 09:43:32.460611+00'),
	('69', 'Rodrigo Sainz', 'Founder & CEO', NULL, 'Founder & CEO at Blockchain Summit Latam', 'https://blockchainsummit.la/wp-content/uploads/2025/09/foto-rodrigo-sainz-2.png', '{}', '[]', '2025-10-15 09:43:32.749041+00');


--
-- Data for Name: bsl_bookings; Type: TABLE DATA; Schema: public; Owner: postgres
--



--
-- Data for Name: bsl_tickets; Type: TABLE DATA; Schema: public; Owner: postgres
--



--
-- Data for Name: speed_dating_chats; Type: TABLE DATA; Schema: public; Owner: postgres
--



--
-- Data for Name: chat_messages; Type: TABLE DATA; Schema: public; Owner: postgres
--



--
-- Data for Name: events; Type: TABLE DATA; Schema: public; Owner: postgres
--

INSERT INTO "public"."events" ("id", "name", "domain", "event_type", "features", "branding", "created_at", "updated_at") VALUES
	('bsl2025', 'BSL 2025', 'bsl2025.hashpass.tech', 'whitelabel', '{matchmaking,speakers,bookings,admin}', '{"logo": "/assets/logos/logo-full-hashpass-white-cyan.svg", "favicon": "/favicon.ico", "primaryColor": "#007AFF", "secondaryColor": "#34A853"}', '2025-10-15 09:55:11.209+00', '2025-10-15 09:55:11.21+00');


--
-- Data for Name: event_agenda; Type: TABLE DATA; Schema: public; Owner: postgres
--

INSERT INTO "public"."event_agenda" ("id", "event_id", "time", "title", "description", "speakers", "type", "location", "created_at", "updated_at") VALUES
	('1', 'bsl2025', '08:00 - 09:00', 'Registro y café de bienvenida', NULL, NULL, 'registration', NULL, '2025-10-15 09:55:21.749+00', '2025-10-15 09:55:21.749+00'),
	('2', 'bsl2025', '09:00 - 09:15', 'Palabras de apertura – Rectora de la Universidad EAFIT', NULL, '{"Claudia Restrepo"}', 'keynote', NULL, '2025-10-15 09:55:21.911+00', '2025-10-15 09:55:21.911+00'),
	('3', 'bsl2025', '09:20 – 09:45', 'Keynote – "Red regional de pruebas para dinero tokenizado"', NULL, NULL, 'keynote', NULL, '2025-10-15 09:55:22.162+00', '2025-10-15 09:55:22.162+00'),
	('4', 'bsl2025', '09:50 – 10:25', 'Keynote – "Infraestructura Financiera Global del Futuro"', NULL, NULL, 'keynote', NULL, '2025-10-15 09:55:22.306+00', '2025-10-15 09:55:22.306+00'),
	('5', 'bsl2025', '10:35 – 11:05', 'Keynote – Colombia Fintech – "El Rol de las Fintech en la Adopción del Dinero Digital en América Latina"', NULL, '{"Gabriel Santos"}', 'keynote', NULL, '2025-10-15 09:55:22.45+00', '2025-10-15 09:55:22.45+00'),
	('6', 'bsl2025', '11:10 – 11:45', 'Keynote – Superintendencia Financiera de Colombia – "El futuro de la supervisión y regulación financiera en la era digital"', NULL, '{"César Ferrari"}', 'keynote', NULL, '2025-10-15 09:55:22.599+00', '2025-10-15 09:55:22.599+00'),
	('7', 'bsl2025', '11:50 – 13:00', 'Panel – "CBDCs y el Futuro del Dinero en LatAm"', NULL, NULL, 'panel', NULL, '2025-10-15 09:55:22.742+00', '2025-10-15 09:55:22.742+00'),
	('8', 'bsl2025', '13:00 – 14:30', 'Almuerzo Libre', NULL, NULL, 'meal', NULL, '2025-10-15 09:55:22.886+00', '2025-10-15 09:55:22.886+00'),
	('9', 'bsl2025', '14:35 – 15:05', 'Keynote – "Activos Digitales, Blockchain y Tokenización de Activos"', NULL, NULL, 'keynote', NULL, '2025-10-15 09:55:23.033+00', '2025-10-15 09:55:23.033+00'),
	('10', 'bsl2025', '15:10 – 16:20', 'Panel (Bancos Comerciales) – "Transformación Digital de la Banca Tradicional"', NULL, NULL, 'panel', NULL, '2025-10-15 09:55:23.189+00', '2025-10-15 09:55:23.189+00'),
	('11', 'bsl2025', '16:25 – 17:35', 'Panel (Reguladores) – "Marco regulatorio para la innovación financiera en LatAm"', NULL, NULL, 'panel', NULL, '2025-10-15 09:55:23.633+00', '2025-10-15 09:55:23.633+00'),
	('12', 'bsl2025', '17:40 – 18:30', 'Panel – "El Futuro del Dinero Digital: Innovación, Confianza y Colaboración en LATAM"', NULL, NULL, 'panel', NULL, '2025-10-15 09:55:23.78+00', '2025-10-15 09:55:23.78+00');


--
-- Data for Name: newsletter_subscribers; Type: TABLE DATA; Schema: public; Owner: postgres
--



--
-- Data for Name: notifications; Type: TABLE DATA; Schema: public; Owner: postgres
--



--
-- Data for Name: speaker_availability; Type: TABLE DATA; Schema: public; Owner: postgres
--



--
-- Data for Name: user_request_limits; Type: TABLE DATA; Schema: public; Owner: postgres
--



--
-- Name: bsl_audit_id_seq; Type: SEQUENCE SET; Schema: public; Owner: postgres
--

SELECT pg_catalog.setval('"public"."bsl_audit_id_seq"', 1, false);


--
-- PostgreSQL database dump complete
--

\unrestrict fpGAz0iKSh9nTde6IaE9c9NvAdntzXp35leg9TGVh7xwiPMtTStwMdlnouvAUaG

RESET ALL;
