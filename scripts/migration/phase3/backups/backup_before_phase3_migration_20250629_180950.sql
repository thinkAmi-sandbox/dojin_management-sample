--
-- PostgreSQL database dump
--

-- Dumped from database version 16.9 (Debian 16.9-1.pgdg120+1)
-- Dumped by pg_dump version 17.5

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
-- Name: drizzle; Type: SCHEMA; Schema: -; Owner: dojin_user
--

CREATE SCHEMA drizzle;


ALTER SCHEMA drizzle OWNER TO dojin_user;

--
-- Name: circle_role; Type: TYPE; Schema: public; Owner: dojin_user
--

CREATE TYPE public.circle_role AS ENUM (
    'representative',
    'member',
    'guest'
);


ALTER TYPE public.circle_role OWNER TO dojin_user;

--
-- Name: exhibit_status; Type: TYPE; Schema: public; Owner: dojin_user
--

CREATE TYPE public.exhibit_status AS ENUM (
    'applied',
    'accepted',
    'rejected',
    'cancelled'
);


ALTER TYPE public.exhibit_status OWNER TO dojin_user;

--
-- Name: stock_movement_type; Type: TYPE; Schema: public; Owner: dojin_user
--

CREATE TYPE public.stock_movement_type AS ENUM (
    'inbound',
    'outbound',
    'transfer',
    'sale',
    'return',
    'adjustment',
    'disposal'
);


ALTER TYPE public.stock_movement_type OWNER TO dojin_user;

--
-- Name: storage_location_type; Type: TYPE; Schema: public; Owner: dojin_user
--

CREATE TYPE public.storage_location_type AS ENUM (
    'home',
    'warehouse',
    'consignment',
    'event'
);


ALTER TYPE public.storage_location_type OWNER TO dojin_user;

--
-- Name: writing_status; Type: TYPE; Schema: public; Owner: dojin_user
--

CREATE TYPE public.writing_status AS ENUM (
    'planning',
    'writing',
    'editing',
    'completed'
);


ALTER TYPE public.writing_status OWNER TO dojin_user;

SET default_tablespace = '';

SET default_table_access_method = heap;

--
-- Name: __drizzle_migrations; Type: TABLE; Schema: drizzle; Owner: dojin_user
--

CREATE TABLE drizzle.__drizzle_migrations (
    id integer NOT NULL,
    hash text NOT NULL,
    created_at bigint
);


ALTER TABLE drizzle.__drizzle_migrations OWNER TO dojin_user;

--
-- Name: __drizzle_migrations_id_seq; Type: SEQUENCE; Schema: drizzle; Owner: dojin_user
--

CREATE SEQUENCE drizzle.__drizzle_migrations_id_seq
    AS integer
    START WITH 1
    INCREMENT BY 1
    NO MINVALUE
    NO MAXVALUE
    CACHE 1;


ALTER SEQUENCE drizzle.__drizzle_migrations_id_seq OWNER TO dojin_user;

--
-- Name: __drizzle_migrations_id_seq; Type: SEQUENCE OWNED BY; Schema: drizzle; Owner: dojin_user
--

ALTER SEQUENCE drizzle.__drizzle_migrations_id_seq OWNED BY drizzle.__drizzle_migrations.id;


--
-- Name: Author; Type: TABLE; Schema: public; Owner: dojin_user
--

CREATE TABLE public."Author" (
    id integer NOT NULL,
    name character varying(255) NOT NULL,
    email character varying(255),
    bio text,
    "createdAt" timestamp(3) without time zone DEFAULT now() NOT NULL,
    "updatedAt" timestamp(3) without time zone DEFAULT now() NOT NULL
);


ALTER TABLE public."Author" OWNER TO dojin_user;

--
-- Name: Author_id_seq; Type: SEQUENCE; Schema: public; Owner: dojin_user
--

CREATE SEQUENCE public."Author_id_seq"
    AS integer
    START WITH 1
    INCREMENT BY 1
    NO MINVALUE
    NO MAXVALUE
    CACHE 1;


ALTER SEQUENCE public."Author_id_seq" OWNER TO dojin_user;

--
-- Name: Author_id_seq; Type: SEQUENCE OWNED BY; Schema: public; Owner: dojin_user
--

ALTER SEQUENCE public."Author_id_seq" OWNED BY public."Author".id;


--
-- Name: Book; Type: TABLE; Schema: public; Owner: dojin_user
--

CREATE TABLE public."Book" (
    id integer NOT NULL,
    title character varying(255) NOT NULL,
    subtitle character varying(255),
    description text,
    "createdAt" timestamp(3) without time zone DEFAULT now() NOT NULL,
    "updatedAt" timestamp(3) without time zone DEFAULT now() NOT NULL,
    status public.writing_status DEFAULT 'planning'::public.writing_status NOT NULL,
    genre character varying(100),
    "seriesName" character varying(255),
    "seriesNumber" integer
);


ALTER TABLE public."Book" OWNER TO dojin_user;

--
-- Name: BookAuthor; Type: TABLE; Schema: public; Owner: dojin_user
--

CREATE TABLE public."BookAuthor" (
    "bookId" integer NOT NULL,
    "authorId" integer NOT NULL
);


ALTER TABLE public."BookAuthor" OWNER TO dojin_user;

--
-- Name: Book_id_seq; Type: SEQUENCE; Schema: public; Owner: dojin_user
--

CREATE SEQUENCE public."Book_id_seq"
    AS integer
    START WITH 1
    INCREMENT BY 1
    NO MINVALUE
    NO MAXVALUE
    CACHE 1;


ALTER SEQUENCE public."Book_id_seq" OWNER TO dojin_user;

--
-- Name: Book_id_seq; Type: SEQUENCE OWNED BY; Schema: public; Owner: dojin_user
--

ALTER SEQUENCE public."Book_id_seq" OWNED BY public."Book".id;


--
-- Name: Circle; Type: TABLE; Schema: public; Owner: dojin_user
--

CREATE TABLE public."Circle" (
    id integer NOT NULL,
    name character varying(255) NOT NULL,
    "representativeName" character varying(255) NOT NULL,
    email character varying(255) NOT NULL,
    description text,
    "createdAt" timestamp(3) without time zone DEFAULT now() NOT NULL,
    "updatedAt" timestamp(3) without time zone DEFAULT now() NOT NULL
);


ALTER TABLE public."Circle" OWNER TO dojin_user;

--
-- Name: CircleAuthor; Type: TABLE; Schema: public; Owner: dojin_user
--

CREATE TABLE public."CircleAuthor" (
    "circleId" integer NOT NULL,
    "authorId" integer NOT NULL,
    role public.circle_role DEFAULT 'member'::public.circle_role NOT NULL,
    "joinedAt" timestamp(3) without time zone DEFAULT now() NOT NULL,
    "leftAt" timestamp(3) without time zone,
    notes text,
    "createdAt" timestamp(3) without time zone DEFAULT now() NOT NULL,
    "updatedAt" timestamp(3) without time zone DEFAULT now() NOT NULL
);


ALTER TABLE public."CircleAuthor" OWNER TO dojin_user;

--
-- Name: Circle_id_seq; Type: SEQUENCE; Schema: public; Owner: dojin_user
--

CREATE SEQUENCE public."Circle_id_seq"
    AS integer
    START WITH 1
    INCREMENT BY 1
    NO MINVALUE
    NO MAXVALUE
    CACHE 1;


ALTER SEQUENCE public."Circle_id_seq" OWNER TO dojin_user;

--
-- Name: Circle_id_seq; Type: SEQUENCE OWNED BY; Schema: public; Owner: dojin_user
--

ALTER SEQUENCE public."Circle_id_seq" OWNED BY public."Circle".id;


--
-- Name: Deadline; Type: TABLE; Schema: public; Owner: dojin_user
--

CREATE TABLE public."Deadline" (
    id integer NOT NULL,
    "bookId" integer NOT NULL,
    title character varying(255) NOT NULL,
    "dueDate" timestamp(3) without time zone NOT NULL,
    description text,
    "createdAt" timestamp(3) without time zone DEFAULT now() NOT NULL,
    "updatedAt" timestamp(3) without time zone DEFAULT now() NOT NULL
);


ALTER TABLE public."Deadline" OWNER TO dojin_user;

--
-- Name: Deadline_id_seq; Type: SEQUENCE; Schema: public; Owner: dojin_user
--

CREATE SEQUENCE public."Deadline_id_seq"
    AS integer
    START WITH 1
    INCREMENT BY 1
    NO MINVALUE
    NO MAXVALUE
    CACHE 1;


ALTER SEQUENCE public."Deadline_id_seq" OWNER TO dojin_user;

--
-- Name: Deadline_id_seq; Type: SEQUENCE OWNED BY; Schema: public; Owner: dojin_user
--

ALTER SEQUENCE public."Deadline_id_seq" OWNED BY public."Deadline".id;


--
-- Name: Edition; Type: TABLE; Schema: public; Owner: dojin_user
--

CREATE TABLE public."Edition" (
    id integer NOT NULL,
    "bookId" integer NOT NULL,
    "versionName" character varying(100) NOT NULL,
    "versionNumber" integer DEFAULT 1 NOT NULL,
    isbn character varying(13),
    "pageCount" integer,
    "basePrice" integer NOT NULL,
    "printingCost" integer,
    "publishDate" date,
    "editionNotes" text,
    "coverImageUrl" character varying(500),
    "isActive" boolean DEFAULT true NOT NULL,
    "isSoldOut" boolean DEFAULT false NOT NULL,
    "createdAt" timestamp(3) without time zone DEFAULT now() NOT NULL,
    "updatedAt" timestamp(3) without time zone DEFAULT now() NOT NULL
);


ALTER TABLE public."Edition" OWNER TO dojin_user;

--
-- Name: Edition_id_seq; Type: SEQUENCE; Schema: public; Owner: dojin_user
--

CREATE SEQUENCE public."Edition_id_seq"
    AS integer
    START WITH 1
    INCREMENT BY 1
    NO MINVALUE
    NO MAXVALUE
    CACHE 1;


ALTER SEQUENCE public."Edition_id_seq" OWNER TO dojin_user;

--
-- Name: Edition_id_seq; Type: SEQUENCE OWNED BY; Schema: public; Owner: dojin_user
--

ALTER SEQUENCE public."Edition_id_seq" OWNED BY public."Edition".id;


--
-- Name: Event; Type: TABLE; Schema: public; Owner: dojin_user
--

CREATE TABLE public."Event" (
    id integer NOT NULL,
    name character varying(255) NOT NULL,
    "eventDate" date NOT NULL,
    venue character varying(255) NOT NULL,
    "applicationStartDate" date NOT NULL,
    "applicationEndDate" date NOT NULL,
    description text,
    "createdAt" timestamp(3) without time zone DEFAULT now() NOT NULL,
    "updatedAt" timestamp(3) without time zone DEFAULT now() NOT NULL
);


ALTER TABLE public."Event" OWNER TO dojin_user;

--
-- Name: Event_id_seq; Type: SEQUENCE; Schema: public; Owner: dojin_user
--

CREATE SEQUENCE public."Event_id_seq"
    AS integer
    START WITH 1
    INCREMENT BY 1
    NO MINVALUE
    NO MAXVALUE
    CACHE 1;


ALTER SEQUENCE public."Event_id_seq" OWNER TO dojin_user;

--
-- Name: Event_id_seq; Type: SEQUENCE OWNED BY; Schema: public; Owner: dojin_user
--

ALTER SEQUENCE public."Event_id_seq" OWNED BY public."Event".id;


--
-- Name: Exhibit; Type: TABLE; Schema: public; Owner: dojin_user
--

CREATE TABLE public."Exhibit" (
    id integer NOT NULL,
    "eventId" integer NOT NULL,
    "circleId" integer NOT NULL,
    status public.exhibit_status DEFAULT 'applied'::public.exhibit_status NOT NULL,
    "applicationDate" timestamp(3) without time zone DEFAULT now() NOT NULL,
    "resultDate" timestamp(3) without time zone,
    "spaceNumber" character varying(50),
    "spaceType" character varying(50),
    "applicationNotes" text,
    "resultNotes" text,
    "createdAt" timestamp(3) without time zone DEFAULT now() NOT NULL,
    "updatedAt" timestamp(3) without time zone DEFAULT now() NOT NULL
);


ALTER TABLE public."Exhibit" OWNER TO dojin_user;

--
-- Name: ExhibitBook; Type: TABLE; Schema: public; Owner: dojin_user
--

CREATE TABLE public."ExhibitBook" (
    "exhibitId" integer NOT NULL,
    "bookId" integer,
    "plannedQuantity" integer DEFAULT 0 NOT NULL,
    price integer DEFAULT 0 NOT NULL,
    "displayOrder" integer DEFAULT 0 NOT NULL,
    "createdAt" timestamp(3) without time zone DEFAULT now() NOT NULL,
    "updatedAt" timestamp(3) without time zone DEFAULT now() NOT NULL,
    "editionId" integer,
    "actualQuantity" integer,
    "soldQuantity" integer,
    "remainingQuantity" integer
);


ALTER TABLE public."ExhibitBook" OWNER TO dojin_user;

--
-- Name: Exhibit_id_seq; Type: SEQUENCE; Schema: public; Owner: dojin_user
--

CREATE SEQUENCE public."Exhibit_id_seq"
    AS integer
    START WITH 1
    INCREMENT BY 1
    NO MINVALUE
    NO MAXVALUE
    CACHE 1;


ALTER SEQUENCE public."Exhibit_id_seq" OWNER TO dojin_user;

--
-- Name: Exhibit_id_seq; Type: SEQUENCE OWNED BY; Schema: public; Owner: dojin_user
--

ALTER SEQUENCE public."Exhibit_id_seq" OWNED BY public."Exhibit".id;


--
-- Name: PrintingCompany; Type: TABLE; Schema: public; Owner: dojin_user
--

CREATE TABLE public."PrintingCompany" (
    id integer NOT NULL,
    name character varying(255) NOT NULL,
    "websiteUrl" character varying(500),
    notes text,
    "createdAt" timestamp(3) without time zone DEFAULT now() NOT NULL,
    "updatedAt" timestamp(3) without time zone DEFAULT now() NOT NULL
);


ALTER TABLE public."PrintingCompany" OWNER TO dojin_user;

--
-- Name: PrintingCompany_id_seq; Type: SEQUENCE; Schema: public; Owner: dojin_user
--

CREATE SEQUENCE public."PrintingCompany_id_seq"
    AS integer
    START WITH 1
    INCREMENT BY 1
    NO MINVALUE
    NO MAXVALUE
    CACHE 1;


ALTER SEQUENCE public."PrintingCompany_id_seq" OWNER TO dojin_user;

--
-- Name: PrintingCompany_id_seq; Type: SEQUENCE OWNED BY; Schema: public; Owner: dojin_user
--

ALTER SEQUENCE public."PrintingCompany_id_seq" OWNED BY public."PrintingCompany".id;


--
-- Name: Stock; Type: TABLE; Schema: public; Owner: dojin_user
--

CREATE TABLE public."Stock" (
    id integer NOT NULL,
    "editionId" integer NOT NULL,
    "locationId" integer NOT NULL,
    quantity integer DEFAULT 0 NOT NULL,
    "reservedQuantity" integer DEFAULT 0 NOT NULL,
    "availableQuantity" integer DEFAULT 0 NOT NULL,
    "lastCheckedAt" timestamp(3) without time zone,
    notes text,
    "createdAt" timestamp(3) without time zone DEFAULT now() NOT NULL,
    "updatedAt" timestamp(3) without time zone DEFAULT now() NOT NULL,
    CONSTRAINT chk_quantity_balance CHECK ((quantity = ("reservedQuantity" + "availableQuantity"))),
    CONSTRAINT chk_quantity_positive CHECK (((quantity >= 0) AND ("reservedQuantity" >= 0) AND ("availableQuantity" >= 0)))
);


ALTER TABLE public."Stock" OWNER TO dojin_user;

--
-- Name: StockMovement; Type: TABLE; Schema: public; Owner: dojin_user
--

CREATE TABLE public."StockMovement" (
    id integer NOT NULL,
    "editionId" integer NOT NULL,
    "fromLocationId" integer,
    "toLocationId" integer,
    quantity integer NOT NULL,
    "movementType" public.stock_movement_type NOT NULL,
    "referenceType" character varying(50),
    "referenceId" integer,
    reason text,
    "movedAt" timestamp(3) without time zone DEFAULT now() NOT NULL,
    "createdBy" character varying(255),
    "createdAt" timestamp(3) without time zone DEFAULT now() NOT NULL
);


ALTER TABLE public."StockMovement" OWNER TO dojin_user;

--
-- Name: StockMovement_id_seq; Type: SEQUENCE; Schema: public; Owner: dojin_user
--

CREATE SEQUENCE public."StockMovement_id_seq"
    AS integer
    START WITH 1
    INCREMENT BY 1
    NO MINVALUE
    NO MAXVALUE
    CACHE 1;


ALTER SEQUENCE public."StockMovement_id_seq" OWNER TO dojin_user;

--
-- Name: StockMovement_id_seq; Type: SEQUENCE OWNED BY; Schema: public; Owner: dojin_user
--

ALTER SEQUENCE public."StockMovement_id_seq" OWNED BY public."StockMovement".id;


--
-- Name: Stock_id_seq; Type: SEQUENCE; Schema: public; Owner: dojin_user
--

CREATE SEQUENCE public."Stock_id_seq"
    AS integer
    START WITH 1
    INCREMENT BY 1
    NO MINVALUE
    NO MAXVALUE
    CACHE 1;


ALTER SEQUENCE public."Stock_id_seq" OWNER TO dojin_user;

--
-- Name: Stock_id_seq; Type: SEQUENCE OWNED BY; Schema: public; Owner: dojin_user
--

ALTER SEQUENCE public."Stock_id_seq" OWNED BY public."Stock".id;


--
-- Name: StorageLocation; Type: TABLE; Schema: public; Owner: dojin_user
--

CREATE TABLE public."StorageLocation" (
    id integer NOT NULL,
    name character varying(255) NOT NULL,
    type public.storage_location_type NOT NULL,
    "isConsignment" boolean DEFAULT false NOT NULL,
    address text,
    "contactInfo" text,
    notes text,
    "createdAt" timestamp(3) without time zone DEFAULT now() NOT NULL,
    "updatedAt" timestamp(3) without time zone DEFAULT now() NOT NULL
);


ALTER TABLE public."StorageLocation" OWNER TO dojin_user;

--
-- Name: StorageLocation_id_seq; Type: SEQUENCE; Schema: public; Owner: dojin_user
--

CREATE SEQUENCE public."StorageLocation_id_seq"
    AS integer
    START WITH 1
    INCREMENT BY 1
    NO MINVALUE
    NO MAXVALUE
    CACHE 1;


ALTER SEQUENCE public."StorageLocation_id_seq" OWNER TO dojin_user;

--
-- Name: StorageLocation_id_seq; Type: SEQUENCE OWNED BY; Schema: public; Owner: dojin_user
--

ALTER SEQUENCE public."StorageLocation_id_seq" OWNED BY public."StorageLocation".id;


--
-- Name: Submission; Type: TABLE; Schema: public; Owner: dojin_user
--

CREATE TABLE public."Submission" (
    id integer NOT NULL,
    "bookId" integer NOT NULL,
    "printingCompanyId" integer NOT NULL,
    status character varying(20) DEFAULT 'draft'::character varying NOT NULL,
    "submissionDate" timestamp(3) without time zone,
    "expectedDeliveryDate" timestamp(3) without time zone,
    "actualDeliveryDate" timestamp(3) without time zone,
    quantity integer NOT NULL,
    "specificationNotes" text,
    "printingCost" integer,
    "shippingCost" integer,
    "otherCost" integer,
    "totalCost" integer,
    "discountType" character varying(50),
    "deliveryDestination" character varying(255),
    "deliveryNotes" text,
    "submissionFileNotes" text,
    "generalNotes" text,
    "createdAt" timestamp(3) without time zone DEFAULT now() NOT NULL,
    "updatedAt" timestamp(3) without time zone DEFAULT now() NOT NULL
);


ALTER TABLE public."Submission" OWNER TO dojin_user;

--
-- Name: Submission_id_seq; Type: SEQUENCE; Schema: public; Owner: dojin_user
--

CREATE SEQUENCE public."Submission_id_seq"
    AS integer
    START WITH 1
    INCREMENT BY 1
    NO MINVALUE
    NO MAXVALUE
    CACHE 1;


ALTER SEQUENCE public."Submission_id_seq" OWNER TO dojin_user;

--
-- Name: Submission_id_seq; Type: SEQUENCE OWNED BY; Schema: public; Owner: dojin_user
--

ALTER SEQUENCE public."Submission_id_seq" OWNED BY public."Submission".id;


--
-- Name: __drizzle_migrations id; Type: DEFAULT; Schema: drizzle; Owner: dojin_user
--

ALTER TABLE ONLY drizzle.__drizzle_migrations ALTER COLUMN id SET DEFAULT nextval('drizzle.__drizzle_migrations_id_seq'::regclass);


--
-- Name: Author id; Type: DEFAULT; Schema: public; Owner: dojin_user
--

ALTER TABLE ONLY public."Author" ALTER COLUMN id SET DEFAULT nextval('public."Author_id_seq"'::regclass);


--
-- Name: Book id; Type: DEFAULT; Schema: public; Owner: dojin_user
--

ALTER TABLE ONLY public."Book" ALTER COLUMN id SET DEFAULT nextval('public."Book_id_seq"'::regclass);


--
-- Name: Circle id; Type: DEFAULT; Schema: public; Owner: dojin_user
--

ALTER TABLE ONLY public."Circle" ALTER COLUMN id SET DEFAULT nextval('public."Circle_id_seq"'::regclass);


--
-- Name: Deadline id; Type: DEFAULT; Schema: public; Owner: dojin_user
--

ALTER TABLE ONLY public."Deadline" ALTER COLUMN id SET DEFAULT nextval('public."Deadline_id_seq"'::regclass);


--
-- Name: Edition id; Type: DEFAULT; Schema: public; Owner: dojin_user
--

ALTER TABLE ONLY public."Edition" ALTER COLUMN id SET DEFAULT nextval('public."Edition_id_seq"'::regclass);


--
-- Name: Event id; Type: DEFAULT; Schema: public; Owner: dojin_user
--

ALTER TABLE ONLY public."Event" ALTER COLUMN id SET DEFAULT nextval('public."Event_id_seq"'::regclass);


--
-- Name: Exhibit id; Type: DEFAULT; Schema: public; Owner: dojin_user
--

ALTER TABLE ONLY public."Exhibit" ALTER COLUMN id SET DEFAULT nextval('public."Exhibit_id_seq"'::regclass);


--
-- Name: PrintingCompany id; Type: DEFAULT; Schema: public; Owner: dojin_user
--

ALTER TABLE ONLY public."PrintingCompany" ALTER COLUMN id SET DEFAULT nextval('public."PrintingCompany_id_seq"'::regclass);


--
-- Name: Stock id; Type: DEFAULT; Schema: public; Owner: dojin_user
--

ALTER TABLE ONLY public."Stock" ALTER COLUMN id SET DEFAULT nextval('public."Stock_id_seq"'::regclass);


--
-- Name: StockMovement id; Type: DEFAULT; Schema: public; Owner: dojin_user
--

ALTER TABLE ONLY public."StockMovement" ALTER COLUMN id SET DEFAULT nextval('public."StockMovement_id_seq"'::regclass);


--
-- Name: StorageLocation id; Type: DEFAULT; Schema: public; Owner: dojin_user
--

ALTER TABLE ONLY public."StorageLocation" ALTER COLUMN id SET DEFAULT nextval('public."StorageLocation_id_seq"'::regclass);


--
-- Name: Submission id; Type: DEFAULT; Schema: public; Owner: dojin_user
--

ALTER TABLE ONLY public."Submission" ALTER COLUMN id SET DEFAULT nextval('public."Submission_id_seq"'::regclass);


--
-- Data for Name: __drizzle_migrations; Type: TABLE DATA; Schema: drizzle; Owner: dojin_user
--

COPY drizzle.__drizzle_migrations (id, hash, created_at) FROM stdin;
1	b0f5b9d4d5010a0342863e0e803dc0d00fe85bf158fc27fbb4db9a5d3354f848	1749872619992
2	0fa1485207217ae8852e1484a8825da5fceaea4788726dce5004398044205f14	1749997646331
3	17dbb19bb753bcea942c21993ec73b20aafdda4223f90f3752579f1503a7655c	1750038934277
4	23902606a44167753a7a168bc51439d9a875774b46cfd6d3892d52cf0722b42e	1750047760054
5	561589f143a4f27dcbcd56b0c450f773adb45968f99b6792b3e4204280d3bc77	1750076531751
6	d5bf1299490e88555ee41b417e136881e3f3ef7b8879edab70caac87b5f87838	1750255166089
7	3bc9a9dacc68296684f3d694a6107b5d289b9c877a950d2fb52f849b899c55a2	1750595687571
8	82411165d91ba453faef9105b31349a09a778f367d64ba48b0c32f99c8e35b14	1750598953566
9	596fc8e464edf1cc42fd74a8b0022a66d0f8b86ececc053ab8503fb1638adaf1	1750627680263
10	12bd43044d71d2fd64180077f87f617125659c86e6d7f29c91e277ddb69ee515	1750682620779
11	062e1947527adc561b815d3c530736a64390a876795387efaf77c5b2560f2e4f	1750717167138
12	40738e0b9dff71252ce51ee86b6d7a178a221111d0f8ffe9a7f224373e5872f7	1750848927543
13	72373ea88b8bcda2631e7963865d0df4ce33a9b4bd72cf0eb2ec08b8a4addb4e	1750849717995
14	6c0f02c9a828f6239c3aee6509927af6d166c7b16605d35577fc522281726790	1751094657124
15	9af4b92b556e6eb2884f27eb62da01f6390d0a145abc2f435d1e7d84c642a093	1751099841483
16	3b48c8149f8a4627d287dc3f4a08261f4491d7f89039ce8188554dafd6821af0	1751151064724
17	058a4eb11d2bb3936d4b10741870053953b64d8c7d4c6166c23612499ecf28e8	1751165313937
\.


--
-- Data for Name: Author; Type: TABLE DATA; Schema: public; Owner: dojin_user
--

COPY public."Author" (id, name, email, bio, "createdAt", "updatedAt") FROM stdin;
2	a	a@example.com	\N	2025-06-16 14:22:06.669	2025-06-16 14:22:06.669
\.


--
-- Data for Name: Book; Type: TABLE DATA; Schema: public; Owner: dojin_user
--

COPY public."Book" (id, title, subtitle, description, "createdAt", "updatedAt", status, genre, "seriesName", "seriesNumber") FROM stdin;
5	あ	\N	\N	2025-06-15 23:35:20.338	2025-06-15 14:41:51.893	writing	\N	\N	\N
6	a	\N	\N	2025-06-16 10:45:40.802	2025-06-16 10:45:40.802	planning	\N	\N	\N
\.


--
-- Data for Name: BookAuthor; Type: TABLE DATA; Schema: public; Owner: dojin_user
--

COPY public."BookAuthor" ("bookId", "authorId") FROM stdin;
5	2
\.


--
-- Data for Name: Circle; Type: TABLE DATA; Schema: public; Owner: dojin_user
--

COPY public."Circle" (id, name, "representativeName", email, description, "createdAt", "updatedAt") FROM stdin;
2	まいさーくる	ふーたろう	foo@example.com	\N	2025-06-23 06:16:44.121	2025-06-23 06:16:44.121
\.


--
-- Data for Name: CircleAuthor; Type: TABLE DATA; Schema: public; Owner: dojin_user
--

COPY public."CircleAuthor" ("circleId", "authorId", role, "joinedAt", "leftAt", notes, "createdAt", "updatedAt") FROM stdin;
\.


--
-- Data for Name: Deadline; Type: TABLE DATA; Schema: public; Owner: dojin_user
--

COPY public."Deadline" (id, "bookId", title, "dueDate", description, "createdAt", "updatedAt") FROM stdin;
2	5	初稿	2027-10-12 09:48:00	初めての締切	2025-06-16 18:49:11.68	2025-06-16 18:49:11.68
\.


--
-- Data for Name: Edition; Type: TABLE DATA; Schema: public; Owner: dojin_user
--

COPY public."Edition" (id, "bookId", "versionName", "versionNumber", isbn, "pageCount", "basePrice", "printingCost", "publishDate", "editionNotes", "coverImageUrl", "isActive", "isSoldOut", "createdAt", "updatedAt") FROM stdin;
2	5	初版	1		100	1000	300	\N			t	f	2025-06-26 22:06:25.673	2025-06-26 13:33:57.988
\.


--
-- Data for Name: Event; Type: TABLE DATA; Schema: public; Owner: dojin_user
--

COPY public."Event" (id, name, "eventDate", venue, "applicationStartDate", "applicationEndDate", description, "createdAt", "updatedAt") FROM stdin;
2	最初のイベント	2025-10-01	新宿	2025-09-01	2025-09-30	開催します	2025-06-23 06:43:01.179	2025-06-23 06:43:01.179
\.


--
-- Data for Name: Exhibit; Type: TABLE DATA; Schema: public; Owner: dojin_user
--

COPY public."Exhibit" (id, "eventId", "circleId", status, "applicationDate", "resultDate", "spaceNumber", "spaceType", "applicationNotes", "resultNotes", "createdAt", "updatedAt") FROM stdin;
2	2	2	applied	2025-06-23 06:44:07.61	\N	大会議場	一般	個人サークルです	\N	2025-06-23 06:44:07.61	2025-06-23 06:44:07.61
3	2	2	applied	2025-06-23 09:00:31.275	\N	\N	壁	あ	\N	2025-06-23 09:00:31.275	2025-06-23 09:00:31.275
4	2	2	applied	2025-06-23 21:23:27.315	\N	\N	壁	a	\N	2025-06-23 21:23:27.315	2025-06-23 21:23:27.315
\.


--
-- Data for Name: ExhibitBook; Type: TABLE DATA; Schema: public; Owner: dojin_user
--

COPY public."ExhibitBook" ("exhibitId", "bookId", "plannedQuantity", price, "displayOrder", "createdAt", "updatedAt", "editionId", "actualQuantity", "soldQuantity", "remainingQuantity") FROM stdin;
4	5	100	200	0	2025-06-24 07:14:53.506	2025-06-24 07:14:53.506	\N	\N	\N	\N
\.


--
-- Data for Name: PrintingCompany; Type: TABLE DATA; Schema: public; Owner: dojin_user
--

COPY public."PrintingCompany" (id, name, "websiteUrl", notes, "createdAt", "updatedAt") FROM stdin;
2	テスト印刷所	https://example.com	びこうです	2025-06-19 20:29:48.548	2025-06-19 20:29:48.548
\.


--
-- Data for Name: Stock; Type: TABLE DATA; Schema: public; Owner: dojin_user
--

COPY public."Stock" (id, "editionId", "locationId", quantity, "reservedQuantity", "availableQuantity", "lastCheckedAt", notes, "createdAt", "updatedAt") FROM stdin;
2	2	2	10	0	10	2025-06-29 02:17:09.157	a	2025-06-29 11:17:09.159	2025-06-29 11:17:09.159
\.


--
-- Data for Name: StockMovement; Type: TABLE DATA; Schema: public; Owner: dojin_user
--

COPY public."StockMovement" (id, "editionId", "fromLocationId", "toLocationId", quantity, "movementType", "referenceType", "referenceId", reason, "movedAt", "createdBy", "createdAt") FROM stdin;
\.


--
-- Data for Name: StorageLocation; Type: TABLE DATA; Schema: public; Owner: dojin_user
--

COPY public."StorageLocation" (id, name, type, "isConsignment", address, "contactInfo", notes, "createdAt", "updatedAt") FROM stdin;
2	我が家	home	t	\N	\N	\N	2025-06-28 17:05:53.792	2025-06-28 17:05:53.792
\.


--
-- Data for Name: Submission; Type: TABLE DATA; Schema: public; Owner: dojin_user
--

COPY public."Submission" (id, "bookId", "printingCompanyId", status, "submissionDate", "expectedDeliveryDate", "actualDeliveryDate", quantity, "specificationNotes", "printingCost", "shippingCost", "otherCost", "totalCost", "discountType", "deliveryDestination", "deliveryNotes", "submissionFileNotes", "generalNotes", "createdAt", "updatedAt") FROM stdin;
1	5	2	printing	2025-10-11 00:00:00	2025-11-10 00:00:00	\N	10	A5サイズ	3000	100	40	3140	直前割	技術書典	サークルの下に置く	pdfファイルでつくりました	日中は電話に出れます	2025-06-19 20:31:16.017	2025-06-22 05:09:44.84
\.


--
-- Name: __drizzle_migrations_id_seq; Type: SEQUENCE SET; Schema: drizzle; Owner: dojin_user
--

SELECT pg_catalog.setval('drizzle.__drizzle_migrations_id_seq', 17, true);


--
-- Name: Author_id_seq; Type: SEQUENCE SET; Schema: public; Owner: dojin_user
--

SELECT pg_catalog.setval('public."Author_id_seq"', 2, true);


--
-- Name: Book_id_seq; Type: SEQUENCE SET; Schema: public; Owner: dojin_user
--

SELECT pg_catalog.setval('public."Book_id_seq"', 7, true);


--
-- Name: Circle_id_seq; Type: SEQUENCE SET; Schema: public; Owner: dojin_user
--

SELECT pg_catalog.setval('public."Circle_id_seq"', 2, true);


--
-- Name: Deadline_id_seq; Type: SEQUENCE SET; Schema: public; Owner: dojin_user
--

SELECT pg_catalog.setval('public."Deadline_id_seq"', 2, true);


--
-- Name: Edition_id_seq; Type: SEQUENCE SET; Schema: public; Owner: dojin_user
--

SELECT pg_catalog.setval('public."Edition_id_seq"', 2, true);


--
-- Name: Event_id_seq; Type: SEQUENCE SET; Schema: public; Owner: dojin_user
--

SELECT pg_catalog.setval('public."Event_id_seq"', 2, true);


--
-- Name: Exhibit_id_seq; Type: SEQUENCE SET; Schema: public; Owner: dojin_user
--

SELECT pg_catalog.setval('public."Exhibit_id_seq"', 4, true);


--
-- Name: PrintingCompany_id_seq; Type: SEQUENCE SET; Schema: public; Owner: dojin_user
--

SELECT pg_catalog.setval('public."PrintingCompany_id_seq"', 2, true);


--
-- Name: StockMovement_id_seq; Type: SEQUENCE SET; Schema: public; Owner: dojin_user
--

SELECT pg_catalog.setval('public."StockMovement_id_seq"', 1, false);


--
-- Name: Stock_id_seq; Type: SEQUENCE SET; Schema: public; Owner: dojin_user
--

SELECT pg_catalog.setval('public."Stock_id_seq"', 2, true);


--
-- Name: StorageLocation_id_seq; Type: SEQUENCE SET; Schema: public; Owner: dojin_user
--

SELECT pg_catalog.setval('public."StorageLocation_id_seq"', 2, true);


--
-- Name: Submission_id_seq; Type: SEQUENCE SET; Schema: public; Owner: dojin_user
--

SELECT pg_catalog.setval('public."Submission_id_seq"', 2, true);


--
-- Name: __drizzle_migrations __drizzle_migrations_pkey; Type: CONSTRAINT; Schema: drizzle; Owner: dojin_user
--

ALTER TABLE ONLY drizzle.__drizzle_migrations
    ADD CONSTRAINT __drizzle_migrations_pkey PRIMARY KEY (id);


--
-- Name: Author Author_email_unique; Type: CONSTRAINT; Schema: public; Owner: dojin_user
--

ALTER TABLE ONLY public."Author"
    ADD CONSTRAINT "Author_email_unique" UNIQUE (email);


--
-- Name: Author Author_pkey; Type: CONSTRAINT; Schema: public; Owner: dojin_user
--

ALTER TABLE ONLY public."Author"
    ADD CONSTRAINT "Author_pkey" PRIMARY KEY (id);


--
-- Name: BookAuthor BookAuthor_bookId_authorId_pk; Type: CONSTRAINT; Schema: public; Owner: dojin_user
--

ALTER TABLE ONLY public."BookAuthor"
    ADD CONSTRAINT "BookAuthor_bookId_authorId_pk" PRIMARY KEY ("bookId", "authorId");


--
-- Name: Book Book_pkey; Type: CONSTRAINT; Schema: public; Owner: dojin_user
--

ALTER TABLE ONLY public."Book"
    ADD CONSTRAINT "Book_pkey" PRIMARY KEY (id);


--
-- Name: CircleAuthor CircleAuthor_circleId_authorId_pk; Type: CONSTRAINT; Schema: public; Owner: dojin_user
--

ALTER TABLE ONLY public."CircleAuthor"
    ADD CONSTRAINT "CircleAuthor_circleId_authorId_pk" PRIMARY KEY ("circleId", "authorId");


--
-- Name: Circle Circle_pkey; Type: CONSTRAINT; Schema: public; Owner: dojin_user
--

ALTER TABLE ONLY public."Circle"
    ADD CONSTRAINT "Circle_pkey" PRIMARY KEY (id);


--
-- Name: Deadline Deadline_pkey; Type: CONSTRAINT; Schema: public; Owner: dojin_user
--

ALTER TABLE ONLY public."Deadline"
    ADD CONSTRAINT "Deadline_pkey" PRIMARY KEY (id);


--
-- Name: Edition Edition_isbn_unique; Type: CONSTRAINT; Schema: public; Owner: dojin_user
--

ALTER TABLE ONLY public."Edition"
    ADD CONSTRAINT "Edition_isbn_unique" UNIQUE (isbn);


--
-- Name: Edition Edition_pkey; Type: CONSTRAINT; Schema: public; Owner: dojin_user
--

ALTER TABLE ONLY public."Edition"
    ADD CONSTRAINT "Edition_pkey" PRIMARY KEY (id);


--
-- Name: Event Event_pkey; Type: CONSTRAINT; Schema: public; Owner: dojin_user
--

ALTER TABLE ONLY public."Event"
    ADD CONSTRAINT "Event_pkey" PRIMARY KEY (id);


--
-- Name: Exhibit Exhibit_pkey; Type: CONSTRAINT; Schema: public; Owner: dojin_user
--

ALTER TABLE ONLY public."Exhibit"
    ADD CONSTRAINT "Exhibit_pkey" PRIMARY KEY (id);


--
-- Name: PrintingCompany PrintingCompany_pkey; Type: CONSTRAINT; Schema: public; Owner: dojin_user
--

ALTER TABLE ONLY public."PrintingCompany"
    ADD CONSTRAINT "PrintingCompany_pkey" PRIMARY KEY (id);


--
-- Name: StockMovement StockMovement_pkey; Type: CONSTRAINT; Schema: public; Owner: dojin_user
--

ALTER TABLE ONLY public."StockMovement"
    ADD CONSTRAINT "StockMovement_pkey" PRIMARY KEY (id);


--
-- Name: Stock Stock_pkey; Type: CONSTRAINT; Schema: public; Owner: dojin_user
--

ALTER TABLE ONLY public."Stock"
    ADD CONSTRAINT "Stock_pkey" PRIMARY KEY (id);


--
-- Name: StorageLocation StorageLocation_pkey; Type: CONSTRAINT; Schema: public; Owner: dojin_user
--

ALTER TABLE ONLY public."StorageLocation"
    ADD CONSTRAINT "StorageLocation_pkey" PRIMARY KEY (id);


--
-- Name: Submission Submission_pkey; Type: CONSTRAINT; Schema: public; Owner: dojin_user
--

ALTER TABLE ONLY public."Submission"
    ADD CONSTRAINT "Submission_pkey" PRIMARY KEY (id);


--
-- Name: Stock unq_stock_edition_location; Type: CONSTRAINT; Schema: public; Owner: dojin_user
--

ALTER TABLE ONLY public."Stock"
    ADD CONSTRAINT unq_stock_edition_location UNIQUE ("editionId", "locationId");


--
-- Name: idx_stocks_edition; Type: INDEX; Schema: public; Owner: dojin_user
--

CREATE INDEX idx_stocks_edition ON public."Stock" USING btree ("editionId");


--
-- Name: idx_stocks_edition_location; Type: INDEX; Schema: public; Owner: dojin_user
--

CREATE INDEX idx_stocks_edition_location ON public."Stock" USING btree ("editionId", "locationId");


--
-- Name: idx_stocks_last_checked; Type: INDEX; Schema: public; Owner: dojin_user
--

CREATE INDEX idx_stocks_last_checked ON public."Stock" USING btree ("lastCheckedAt");


--
-- Name: idx_stocks_location; Type: INDEX; Schema: public; Owner: dojin_user
--

CREATE INDEX idx_stocks_location ON public."Stock" USING btree ("locationId");


--
-- Name: BookAuthor BookAuthor_authorId_Author_id_fk; Type: FK CONSTRAINT; Schema: public; Owner: dojin_user
--

ALTER TABLE ONLY public."BookAuthor"
    ADD CONSTRAINT "BookAuthor_authorId_Author_id_fk" FOREIGN KEY ("authorId") REFERENCES public."Author"(id) ON DELETE CASCADE;


--
-- Name: BookAuthor BookAuthor_bookId_Book_id_fk; Type: FK CONSTRAINT; Schema: public; Owner: dojin_user
--

ALTER TABLE ONLY public."BookAuthor"
    ADD CONSTRAINT "BookAuthor_bookId_Book_id_fk" FOREIGN KEY ("bookId") REFERENCES public."Book"(id) ON DELETE CASCADE;


--
-- Name: CircleAuthor CircleAuthor_authorId_Author_id_fk; Type: FK CONSTRAINT; Schema: public; Owner: dojin_user
--

ALTER TABLE ONLY public."CircleAuthor"
    ADD CONSTRAINT "CircleAuthor_authorId_Author_id_fk" FOREIGN KEY ("authorId") REFERENCES public."Author"(id) ON DELETE CASCADE;


--
-- Name: CircleAuthor CircleAuthor_circleId_Circle_id_fk; Type: FK CONSTRAINT; Schema: public; Owner: dojin_user
--

ALTER TABLE ONLY public."CircleAuthor"
    ADD CONSTRAINT "CircleAuthor_circleId_Circle_id_fk" FOREIGN KEY ("circleId") REFERENCES public."Circle"(id) ON DELETE CASCADE;


--
-- Name: Deadline Deadline_bookId_Book_id_fk; Type: FK CONSTRAINT; Schema: public; Owner: dojin_user
--

ALTER TABLE ONLY public."Deadline"
    ADD CONSTRAINT "Deadline_bookId_Book_id_fk" FOREIGN KEY ("bookId") REFERENCES public."Book"(id) ON DELETE CASCADE;


--
-- Name: Edition Edition_bookId_Book_id_fk; Type: FK CONSTRAINT; Schema: public; Owner: dojin_user
--

ALTER TABLE ONLY public."Edition"
    ADD CONSTRAINT "Edition_bookId_Book_id_fk" FOREIGN KEY ("bookId") REFERENCES public."Book"(id) ON DELETE CASCADE;


--
-- Name: ExhibitBook ExhibitBook_bookId_Book_id_fk; Type: FK CONSTRAINT; Schema: public; Owner: dojin_user
--

ALTER TABLE ONLY public."ExhibitBook"
    ADD CONSTRAINT "ExhibitBook_bookId_Book_id_fk" FOREIGN KEY ("bookId") REFERENCES public."Book"(id) ON DELETE CASCADE;


--
-- Name: ExhibitBook ExhibitBook_editionId_Edition_id_fk; Type: FK CONSTRAINT; Schema: public; Owner: dojin_user
--

ALTER TABLE ONLY public."ExhibitBook"
    ADD CONSTRAINT "ExhibitBook_editionId_Edition_id_fk" FOREIGN KEY ("editionId") REFERENCES public."Edition"(id) ON DELETE CASCADE;


--
-- Name: ExhibitBook ExhibitBook_exhibitId_Exhibit_id_fk; Type: FK CONSTRAINT; Schema: public; Owner: dojin_user
--

ALTER TABLE ONLY public."ExhibitBook"
    ADD CONSTRAINT "ExhibitBook_exhibitId_Exhibit_id_fk" FOREIGN KEY ("exhibitId") REFERENCES public."Exhibit"(id) ON DELETE CASCADE;


--
-- Name: Exhibit Exhibit_circleId_Circle_id_fk; Type: FK CONSTRAINT; Schema: public; Owner: dojin_user
--

ALTER TABLE ONLY public."Exhibit"
    ADD CONSTRAINT "Exhibit_circleId_Circle_id_fk" FOREIGN KEY ("circleId") REFERENCES public."Circle"(id) ON DELETE CASCADE;


--
-- Name: Exhibit Exhibit_eventId_Event_id_fk; Type: FK CONSTRAINT; Schema: public; Owner: dojin_user
--

ALTER TABLE ONLY public."Exhibit"
    ADD CONSTRAINT "Exhibit_eventId_Event_id_fk" FOREIGN KEY ("eventId") REFERENCES public."Event"(id) ON DELETE CASCADE;


--
-- Name: StockMovement StockMovement_editionId_Edition_id_fk; Type: FK CONSTRAINT; Schema: public; Owner: dojin_user
--

ALTER TABLE ONLY public."StockMovement"
    ADD CONSTRAINT "StockMovement_editionId_Edition_id_fk" FOREIGN KEY ("editionId") REFERENCES public."Edition"(id) ON DELETE CASCADE;


--
-- Name: StockMovement StockMovement_fromLocationId_StorageLocation_id_fk; Type: FK CONSTRAINT; Schema: public; Owner: dojin_user
--

ALTER TABLE ONLY public."StockMovement"
    ADD CONSTRAINT "StockMovement_fromLocationId_StorageLocation_id_fk" FOREIGN KEY ("fromLocationId") REFERENCES public."StorageLocation"(id);


--
-- Name: StockMovement StockMovement_toLocationId_StorageLocation_id_fk; Type: FK CONSTRAINT; Schema: public; Owner: dojin_user
--

ALTER TABLE ONLY public."StockMovement"
    ADD CONSTRAINT "StockMovement_toLocationId_StorageLocation_id_fk" FOREIGN KEY ("toLocationId") REFERENCES public."StorageLocation"(id);


--
-- Name: Stock Stock_editionId_Edition_id_fk; Type: FK CONSTRAINT; Schema: public; Owner: dojin_user
--

ALTER TABLE ONLY public."Stock"
    ADD CONSTRAINT "Stock_editionId_Edition_id_fk" FOREIGN KEY ("editionId") REFERENCES public."Edition"(id) ON DELETE CASCADE;


--
-- Name: Stock Stock_locationId_StorageLocation_id_fk; Type: FK CONSTRAINT; Schema: public; Owner: dojin_user
--

ALTER TABLE ONLY public."Stock"
    ADD CONSTRAINT "Stock_locationId_StorageLocation_id_fk" FOREIGN KEY ("locationId") REFERENCES public."StorageLocation"(id);


--
-- Name: Submission Submission_bookId_Book_id_fk; Type: FK CONSTRAINT; Schema: public; Owner: dojin_user
--

ALTER TABLE ONLY public."Submission"
    ADD CONSTRAINT "Submission_bookId_Book_id_fk" FOREIGN KEY ("bookId") REFERENCES public."Book"(id) ON DELETE CASCADE;


--
-- Name: Submission Submission_printingCompanyId_PrintingCompany_id_fk; Type: FK CONSTRAINT; Schema: public; Owner: dojin_user
--

ALTER TABLE ONLY public."Submission"
    ADD CONSTRAINT "Submission_printingCompanyId_PrintingCompany_id_fk" FOREIGN KEY ("printingCompanyId") REFERENCES public."PrintingCompany"(id) ON DELETE RESTRICT;


--
-- PostgreSQL database dump complete
--

