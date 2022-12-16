const {
  SLACK_VERIFICATION_TOKEN: token,
} = process.env;

const workspaceData = {
  context_team_id: 'T04DD0FC16Z',
  token,
  api_app_id: 'A04DFUS9W58',
};

export default workspaceData;
