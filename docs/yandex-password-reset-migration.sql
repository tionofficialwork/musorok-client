alter table auth_sms_challenges
  drop constraint if exists auth_sms_challenges_flow_mode_check;

alter table auth_sms_challenges
  add constraint auth_sms_challenges_flow_mode_check
    check (flow_mode in ('login', 'register', 'reset_password'));
