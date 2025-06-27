-- WARNING: This schema is for context only and is not meant to be run.
-- Table order and constraints may not be valid for execution.

CREATE TABLE public.appointments (
  id integer NOT NULL DEFAULT nextval('appointments_id_seq'::regclass),
  user_id integer NOT NULL,
  doctor_id integer,
  appointment_datetime timestamp with time zone NOT NULL,
  location text,
  status character varying DEFAULT 'scheduled'::character varying,
  notes text,
  created_at timestamp with time zone DEFAULT now(),
  requested_date_change timestamp with time zone,
  requested_by integer,
  updated_at timestamp without time zone,
  description text,
  custom_doctor_name character varying,
  custom_doctor_specialty character varying,
  custom_doctor_phone character varying,
  is_custom_appointment boolean DEFAULT false,
  CONSTRAINT appointments_pkey PRIMARY KEY (id),
  CONSTRAINT fk_doctor FOREIGN KEY (doctor_id) REFERENCES public.doctors(id),
  CONSTRAINT fk_user FOREIGN KEY (user_id) REFERENCES public.users(id)
);
CREATE TABLE public.balanca_digital_data (
  id bigint NOT NULL DEFAULT nextval('balanca_digital_data_id_seq'::regclass),
  user_id bigint NOT NULL,
  date date NOT NULL DEFAULT CURRENT_DATE,
  timestamp timestamp with time zone NOT NULL DEFAULT now(),
  weight numeric,
  body_fat numeric,
  bone_mass numeric,
  bmr integer,
  lean_body_mass numeric,
  body_water_mass numeric,
  source character varying DEFAULT 'Health Connect'::character varying,
  created_at timestamp with time zone NOT NULL DEFAULT now(),
  updated_at timestamp with time zone NOT NULL DEFAULT now(),
  CONSTRAINT balanca_digital_data_pkey PRIMARY KEY (id)
);
CREATE TABLE public.conversations (
  id bigint GENERATED ALWAYS AS IDENTITY NOT NULL,
  participant_1_id bigint NOT NULL,
  participant_2_id bigint NOT NULL,
  created_at timestamp with time zone DEFAULT now(),
  last_message_at timestamp with time zone DEFAULT now(),
  last_message text,
  last_message_sender_id bigint,
  is_active boolean DEFAULT true,
  CONSTRAINT conversations_pkey PRIMARY KEY (id),
  CONSTRAINT conversations_participant_2_fkey FOREIGN KEY (participant_2_id) REFERENCES public.users(id),
  CONSTRAINT conversations_participant_1_fkey FOREIGN KEY (participant_1_id) REFERENCES public.users(id)
);
CREATE TABLE public.diary_entries (
  id bigint GENERATED ALWAYS AS IDENTITY NOT NULL,
  user_id bigint NOT NULL,
  title text NOT NULL,
  description text,
  mood text DEFAULT 'normal'::text,
  created_at timestamp with time zone DEFAULT now(),
  updated_at timestamp with time zone,
  fitness_data_id integer,
  symptoms text,
  daily_notes text,
  CONSTRAINT diary_entries_pkey PRIMARY KEY (id),
  CONSTRAINT diary_entries_user_id_fkey FOREIGN KEY (user_id) REFERENCES public.users(id)
);
CREATE TABLE public.doctor_availability (
  id uuid NOT NULL DEFAULT uuid_generate_v4(),
  doctor_id bigint NOT NULL,
  day_of_week integer CHECK (day_of_week >= 0 AND day_of_week <= 6),
  start_time time with time zone NOT NULL,
  end_time time with time zone NOT NULL,
  is_recurring boolean NOT NULL DEFAULT true,
  exception_date date,
  is_available boolean NOT NULL DEFAULT true,
  created_at timestamp with time zone NOT NULL DEFAULT now(),
  updated_at timestamp with time zone NOT NULL DEFAULT now(),
  CONSTRAINT doctor_availability_pkey PRIMARY KEY (id),
  CONSTRAINT doctor_availability_doctor_id_fkey FOREIGN KEY (doctor_id) REFERENCES public.doctors(id)
);
CREATE TABLE public.doctor_ratings (
  id integer NOT NULL DEFAULT nextval('doctor_ratings_id_seq'::regclass),
  appointment_id integer,
  doctor_id integer,
  user_id integer,
  rating integer NOT NULL CHECK (rating >= 1 AND rating <= 5),
  comment text,
  created_at timestamp without time zone DEFAULT CURRENT_TIMESTAMP,
  is_anonymous boolean DEFAULT false,
  CONSTRAINT doctor_ratings_pkey PRIMARY KEY (id),
  CONSTRAINT doctor_ratings_appointment_id_fkey FOREIGN KEY (appointment_id) REFERENCES public.appointments(id),
  CONSTRAINT doctor_ratings_user_id_fkey FOREIGN KEY (user_id) REFERENCES public.users(id),
  CONSTRAINT doctor_ratings_doctor_id_fkey FOREIGN KEY (doctor_id) REFERENCES public.doctors(id)
);
CREATE TABLE public.doctors (
  id integer NOT NULL DEFAULT nextval('doctors_id_seq'::regclass),
  name text NOT NULL,
  specialization text,
  age integer,
  years_experience integer,
  description text,
  created_at timestamp with time zone DEFAULT now(),
  weekly_schedule jsonb DEFAULT '{"friday": {"end": "", "start": ""}, "monday": {"end": "", "start": ""}, "sunday": {"end": "", "start": ""}, "tuesday": {"end": "", "start": ""}, "saturday": {"end": "", "start": ""}, "thursday": {"end": "", "start": ""}, "wednesday": {"end": "", "start": ""}}'::jsonb,
  daily_schedule jsonb DEFAULT '{"evening": {"end": "", "start": ""}, "morning": {"end": "", "start": ""}, "afternoon": {"end": "", "start": ""}}'::jsonb,
  user_id bigint NOT NULL,
  appointment_duration_minutes integer NOT NULL DEFAULT 60,
  work_description text,
  doctor_rating double precision DEFAULT 0,
  doctor_rating_count integer DEFAULT 0,
  CONSTRAINT doctors_pkey PRIMARY KEY (id),
  CONSTRAINT doctors_user_id_fkey FOREIGN KEY (user_id) REFERENCES public.users(id)
);
CREATE TABLE public.medication_confirmations (
  id bigint GENERATED ALWAYS AS IDENTITY NOT NULL,
  scheduled_time text NOT NULL,
  confirmation_date date NOT NULL,
  confirmation_time timestamp with time zone DEFAULT timezone('utc'::text, now()),
  taken boolean NOT NULL DEFAULT false,
  notes text,
  created_at timestamp with time zone NOT NULL DEFAULT timezone('utc'::text, now()),
  user_id bigint,
  pill_id integer NOT NULL,
  schedule_id bigint,
  CONSTRAINT medication_confirmations_pkey PRIMARY KEY (id),
  CONSTRAINT medication_confirmations_schedule_id_fkey FOREIGN KEY (schedule_id) REFERENCES public.medication_schedule_times(id),
  CONSTRAINT medication_confirmations_user_id_fkey FOREIGN KEY (user_id) REFERENCES public.users(id),
  CONSTRAINT medication_confirmations_pill_id_fkey FOREIGN KEY (pill_id) REFERENCES public.pills_warning(id)
);
CREATE TABLE public.medication_schedule_times (
  id bigint GENERATED ALWAYS AS IDENTITY NOT NULL,
  scheduled_date date NOT NULL,
  scheduled_time time without time zone NOT NULL,
  complete_datetime timestamp with time zone NOT NULL,
  dosage text,
  user_id bigint NOT NULL,
  pill_id integer NOT NULL,
  created_at timestamp with time zone NOT NULL DEFAULT timezone('utc'::text, now()),
  status text DEFAULT 'pending'::text,
  notes text,
  medication_id integer,
  CONSTRAINT medication_schedule_times_pkey PRIMARY KEY (id),
  CONSTRAINT medication_schedule_user_fkey FOREIGN KEY (user_id) REFERENCES public.users(id),
  CONSTRAINT medication_schedule_pill_fkey FOREIGN KEY (pill_id) REFERENCES public.pills_warning(id)
);
CREATE TABLE public.messages (
  id bigint GENERATED ALWAYS AS IDENTITY NOT NULL,
  conversation_id bigint NOT NULL,
  sender_id bigint NOT NULL,
  content text NOT NULL,
  message_type text DEFAULT 'text'::text,
  is_read boolean DEFAULT false,
  created_at timestamp with time zone DEFAULT now(),
  updated_at timestamp with time zone DEFAULT now(),
  CONSTRAINT messages_pkey PRIMARY KEY (id),
  CONSTRAINT messages_conversation_id_fkey FOREIGN KEY (conversation_id) REFERENCES public.conversations(id),
  CONSTRAINT messages_sender_id_fkey FOREIGN KEY (sender_id) REFERENCES public.users(id)
);
CREATE TABLE public.pills_warning (
  id integer NOT NULL,
  user_id bigint NOT NULL,
  titulo text,
  quantidade_comprimidos integer,
  quantidade_comprimidos_por_vez integer,
  intervalo_horas integer,
  horario_fixo text,
  data_inicio text,
  data_fim text,
  status character varying,
  CONSTRAINT pills_warning_pkey PRIMARY KEY (id)
);
CREATE TABLE public.scale_measurements (
  id bigint NOT NULL DEFAULT nextval('scale_measurements_id_seq'::regclass),
  user_id text NOT NULL,
  weight numeric NOT NULL,
  bmi numeric,
  body_fat numeric,
  muscle_mass numeric,
  bone_mass numeric,
  water_percentage numeric,
  visceral_fat smallint,
  metabolic_age smallint,
  device_name character varying,
  device_type character varying DEFAULT 'bluetooth_scale'::character varying,
  device_brand character varying,
  measured_at timestamp with time zone NOT NULL DEFAULT now(),
  created_at timestamp with time zone NOT NULL DEFAULT now(),
  updated_at timestamp with time zone NOT NULL DEFAULT now(),
  notes text,
  data_source character varying DEFAULT 'bluetooth_scale'::character varying,
  CONSTRAINT scale_measurements_pkey PRIMARY KEY (id)
);
CREATE TABLE public.users (
  fingerprintid text,
  fullname text NOT NULL,
  name text NOT NULL,
  password text NOT NULL,
  phone text,
  role text NOT NULL,
  email text,
  id bigint NOT NULL DEFAULT nextval('users_id_seq'::regclass),
  pfpimg text,
  biometric_enabled boolean DEFAULT false,
  favorite_doctors text,
  CONSTRAINT users_pkey PRIMARY KEY (id)
);
CREATE TABLE public.wearables_data (
  id bigint NOT NULL DEFAULT nextval('wearables_data_id_seq'::regclass),
  user_id bigint NOT NULL,
  date date NOT NULL DEFAULT CURRENT_DATE,
  timestamp timestamp with time zone NOT NULL DEFAULT now(),
  heart_rate integer,
  steps integer,
  calories integer,
  distance numeric,
  blood_oxygen numeric,
  body_temperature numeric,
  blood_pressure_systolic integer,
  blood_pressure_diastolic integer,
  sleep_duration numeric,
  stress_level integer,
  source character varying DEFAULT 'Health Connect'::character varying,
  created_at timestamp with time zone NOT NULL DEFAULT now(),
  updated_at timestamp with time zone NOT NULL DEFAULT now(),
  CONSTRAINT wearables_data_pkey PRIMARY KEY (id)
);