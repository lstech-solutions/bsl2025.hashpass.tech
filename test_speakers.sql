SET session_replication_role = replica;

--
-- PostgreSQL database dump
--

-- \restrict k0gaF8F2CQyP6GEodjEibcGszK3x3sXFpC3j52coUraI158HFRFQ0Xbe0bXqsyZ

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
-- Data for Name: bsl_speakers; Type: TABLE DATA; Schema: public; Owner: postgres
--



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



--
-- Data for Name: event_agenda; Type: TABLE DATA; Schema: public; Owner: postgres
--



--
-- Data for Name: newsletter_subscribers; Type: TABLE DATA; Schema: public; Owner: postgres
--



--
-- Data for Name: notifications; Type: TABLE DATA; Schema: public; Owner: postgres
--



--
-- Data for Name: passes; Type: TABLE DATA; Schema: public; Owner: postgres
--



--
-- Data for Name: pass_request_limits; Type: TABLE DATA; Schema: public; Owner: postgres
--



--
-- Data for Name: speaker_availability; Type: TABLE DATA; Schema: public; Owner: postgres
--



--
-- Data for Name: subpasses; Type: TABLE DATA; Schema: public; Owner: postgres
--



--
-- Data for Name: user_blocks; Type: TABLE DATA; Schema: public; Owner: postgres
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

-- \unrestrict k0gaF8F2CQyP6GEodjEibcGszK3x3sXFpC3j52coUraI158HFRFQ0Xbe0bXqsyZ

RESET ALL;
