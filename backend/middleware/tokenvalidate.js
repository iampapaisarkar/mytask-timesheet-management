import Auth from "#auth";

const TokenValidate = async (req, res, next) => {
  const authHeader = req.headers["authorization"];
  const token = authHeader && authHeader.split(" ")[1]; // Check if Bearer token exists

  const orgCode = req.headers["ms-organisation-code"] || null;
  const orgId = req.headers["ms-organisation-id"] || null;
  const orgName = req.headers["ms-organisation-name"] || null;

  if (!token) {
    return res.status(401).json({});
  }
  const response = await Auth.verifyToken(token);
  if (response && response.success) {
    console.log("Session is Valid!");
    const userResponse = await Auth.getUserByToken(token);
    if (userResponse && userResponse.success) {
      req.body.user = userResponse.user;
      req.body.user.token = token;
      if (orgCode) {
        req.body.orgCode = orgCode;
        req.body.orgId = orgId;
        req.body.orgName = orgName;
      }
    } else {
      return res.status(401).json({
        message: "Unauthorized HTTP Request!!",
      });
    }
    next();
  } else {
    return res.status(401).json({
      message: "Unauthorized HTTP Request!",
    });
  }
};

export default TokenValidate;
