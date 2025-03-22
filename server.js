const { DynamoDBClient } = require("@aws-sdk/client-dynamodb");
const { DynamoDBDocumentClient, PutCommand, QueryCommand, ScanCommand, UpdateCommand } = require("@aws-sdk/lib-dynamodb");
const bp = require("body-parser");
const ph = require("password-hash");
const uniqId = require("uniqid");
const session = require("express-session");
const express = require("express");
const app = express();

// Configure AWS SDK v3
const client = new DynamoDBClient({
  region: process.env.AWS_REGION || "us-east-1", // Use environment variable or default
  credentials: {
    accessKeyId: process.env.AWS_ACCESS_KEY_ID || "AKIA2CUNLMG2CDMIKVTQ", // Use environment variable or default
    secretAccessKey: process.env.AWS_SECRET_ACCESS_KEY || "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", // Use environment variable or default
  },
});

const dynamoDB = DynamoDBDocumentClient.from(client);

// Middleware
app.set("view engine", "ejs");
app.use(bp.urlencoded({ extended: true }));
app.use(bp.json());
app.use(
  session({
    secret: "food donation app",
    resave: true,
    saveUninitialized: true,
  })
);

// Helper function to query DynamoDB
const queryDynamoDB = async (tableName, keyCondition, attributeValues) => {
  try {
    const params = {
      TableName: tableName,
      KeyConditionExpression: keyCondition,
      ExpressionAttributeValues: attributeValues,
    };
    console.log("Query Params:", JSON.stringify(params, null, 2)); // Debugging log
    const command = new QueryCommand(params);
    const result = await dynamoDB.send(command);
    return result.Items;
  } catch (error) {
    console.error("Error querying DynamoDB:", error);
    throw error;
  }
};

// Helper function to scan DynamoDB
const scanDynamoDB = async (tableName, filterExpression = "", attributeValues = {}, attributeNames = {}) => {
  try {
    const params = {
      TableName: tableName,
    };
    if (filterExpression) {
      params.FilterExpression = filterExpression;
      // Ensure ExpressionAttributeValues is provided and not empty
      if (Object.keys(attributeValues).length === 0) {
        throw new Error("ExpressionAttributeValues must not be empty when using FilterExpression");
      }
      params.ExpressionAttributeValues = attributeValues;
      // Only include ExpressionAttributeNames if it is not empty
      if (Object.keys(attributeNames).length > 0) {
        params.ExpressionAttributeNames = attributeNames;
      }
    }
    console.log("Scan Params:", JSON.stringify(params, null, 2)); // Debugging log
    const command = new ScanCommand(params);
    const result = await dynamoDB.send(command);
    return result.Items;
  } catch (error) {
    console.error("Error scanning DynamoDB:", error);
    throw error;
  }
};

// Helper function to add an item to DynamoDB
const addItemToDynamoDB = async (tableName, item) => {
  try {
    const params = {
      TableName: tableName,
      Item: item,
    };
    console.log("Put Params:", JSON.stringify(params, null, 2)); // Debugging log
    const command = new PutCommand(params);
    await dynamoDB.send(command);
    console.log("Item added successfully:", JSON.stringify(item, null, 2)); // Debugging log
  } catch (error) {
    console.error("Error adding item to DynamoDB:", error);
    throw error;
  }
};

// Helper function to update an item in DynamoDB
const updateItemInDynamoDB = async (tableName, key, updateExpression, attributeValues) => {
  try {
    const params = {
      TableName: tableName,
      Key: key,
      UpdateExpression: updateExpression,
      ExpressionAttributeValues: attributeValues,
    };
    console.log("Update Params:", JSON.stringify(params, null, 2)); // Debugging log
    const command = new UpdateCommand(params);
    await dynamoDB.send(command);
  } catch (error) {
    console.error("Error updating item in DynamoDB:", error);
    throw error;
  }
};

// Routes
app.get("/", function (req, res) {
  res.render("intro");
});

app.get("/signup", function (req, res) {
  res.render("reg_home");
});

app.get("/orgRegister", function (req, res) {
  res.render("org_register", { sucState: false, errState: false });
});

app.get("/donRegister", function (req, res) {
  res.render("don_register", { sucState: false, errState: false });
});

app.get("/orglogin", function (req, res) {
  res.render("org_login", { errState: false });
});

app.get("/donlogin", function (req, res) {
  res.render("don_login", { errState: false });
});

app.get("/donate_grocery", function (req, res) {
  res.render("donat_grocy", { errState: false });
});


app.post("/org_register_submit", async function (req, res) {
  const email = req.body.email;
  const psw = req.body.psw;
  const c_psw = req.body.c_psw;

  const orgExists = await scanDynamoDB("Organizations", "email = :email", { ":email": email });

  if (orgExists.length > 0) {
    res.render("org_register", {
      sucState: false,
      errState: true,
      errMsg: "Organization Already Exists.!",
    });
  } else {
    if (psw == c_psw) {
      const orgData = {
        organization_id: uniqId(), // Ensure this is included
        organization_name: req.body.organization_name,
        owner_name: req.body.owner_name,
        email: email,
        password: ph.generate(psw),
        ph_no: req.body.phone_no,
        state: req.body.state,
        dist: req.body.district,
        city: req.body.city,
        street: req.body.street,
        pincode: req.body.pincode,
      };
      console.log("Inserting Item into DynamoDB:", JSON.stringify(orgData, null, 2)); // Debugging log
      await addItemToDynamoDB("Organizations", orgData);
      res.render("org_register", { sucState: true, errState: false });
    } else {
      res.render("org_register", {
        sucState: false,
        errState: true,
        errMsg: "Password Doesn't Match.!",
      });
    }
  }
});

app.post("/don_register_submit", async function (req, res) {
  const email = req.body.email;
  const psw = req.body.psw;
  const c_psw = req.body.c_psw;

  const donorExists = await scanDynamoDB("Donors", "email = :email", { ":email": email });

  if (donorExists.length > 0) {
    res.render("don_register", {
      sucState: false,
      errState: true,
      errMsg: "Donor Already Exists.!",
    });
  } else {
    if (psw == c_psw) {
      const donorData = {
        donor_id: uniqId(), // Ensure donor_id is included
        Donor_name: req.body.user_name,
        email: email,
        password: ph.generate(psw),
        ph_no: req.body.phone_no,
        state: req.body.state,
        dist: req.body.district,
        city: req.body.city,
        street: req.body.street,
        pincode: req.body.pincode,
      };
      await addItemToDynamoDB("Donors", donorData);
      res.render("don_register", { sucState: true, errState: false });
    } else {
      res.render("don_register", {
        sucState: false,
        errState: true,
        errMsg: "Password Doesn't Match.!",
      });
    }
  }
});

app.post("/org_login_submit", async function (req, res) {
  const org_id = req.body.org_id;
  const email = req.body.email;
  const psw = req.body.psw;

  const orgData = await scanDynamoDB("Organizations", "email = :email", { ":email": email });

  if (orgData.length === 0) {
    res.render("org_login", {
      errState: true,
      errMsg: "Owner not Found.!",
    });
  } else {
    const userData = orgData[0];
    if (!ph.verify(psw, userData.password)) {
      res.render("org_login", {
        errState: true,
        errMsg: "Incorrect password.!",
      });
    } else {
      if (org_id == userData.organization_id) {
        req.session.orgEmail = email;
        const orgHis = await scanDynamoDB(
          "Donation_History",
          "org_email = :email AND #status = :status", // Use #status for reserved keyword
          { ":email": email, ":status": "Pending" },
          { "#status": "Status" } // Map #status to the actual attribute name
        );
        res.render("org_home", {
          name: userData.organization_name,
          dataArr: { org_his_data: orgHis },
        });
      } else {
        res.render("org_login", {
          errState: true,
          errMsg: "Organization not Found.!",
        });
      }
    }
  }
});

app.post("/don_login_submit", async function (req, res) {
  const email = req.body.email;
  const psw = req.body.psw;

  const donorData = await scanDynamoDB("Donors", "email = :email", { ":email": email });

  if (donorData.length === 0) {
    res.render("don_login", {
      errState: true,
      errMsg: "Donor not Found.!",
    });
  } else {
    const userData = donorData[0];
    if (!ph.verify(psw, userData.password)) {
      res.render("don_login", {
        errState: true,
        errMsg: "Incorrect password.!",
      });
    } else {
      req.session.userEmail = email;
      res.render("don_home", { name: userData.Donor_name });
    }
  }
});

app.get("/donat_food", async function (req, res) {
  const organizations = await scanDynamoDB("Organizations", "", {});
  const user_email = req.session.userEmail;
  const donor = await scanDynamoDB("Donors", "email = :email", { ":email": user_email });

  res.render("food_donate_form", {
    dataArr: { org_data: organizations },
    don_details: donor[0],
  });
});

app.get("/donate_grocery", async function (req, res) {
  const organizations = await scanDynamoDB("Organizations", "", {});
  const user_email = req.session.userEmail;

  if (!user_email) {
    return res.redirect("/donlogin"); // Redirect to login if session is invalid
  }

  const donor = await scanDynamoDB("Donors", "email = :email", { ":email": user_email });

  res.render("donat_grocy", {
    dataArr: { org_data: organizations },
    don_details: donor[0],
  });
});

app.post("/donat_food_submit", async function (req, res) {
  const orderID = uniqId();
  const date = new Date();
  const user_email = req.session.userEmail;
  const donor = await scanDynamoDB("Donors", "email = :email", { ":email": user_email });
  const org = await scanDynamoDB("Organizations", "organization_name = :name", { ":name": req.body.orgname });

  const donationData = {
    OrderId: orderID, // Ensure OrderId is included
    Status: "Pending",
    Date: `${date.getMonth() + 1}/${date.getDate()}/${date.getFullYear()}`,
    Donor_name: donor[0].Donor_name,
    Donor_ph_no: donor[0].ph_no,
    Donor_email: donor[0].email,
    Donation: req.body.Donation,
    Donor_address: `${donor[0].street}, ${donor[0].city}, ${donor[0].dist}, ${donor[0].state}, ${donor[0].pincode}`,
    Items: req.body.item,
    EachItem_Qty: req.body.qty,
    org_email: org[0].email,
  };

  await addItemToDynamoDB("Donation_History", donationData);
  res.redirect("/don_home");
});

app.get("/don_history", async (req, res) => {
  const donor_email = req.session.userEmail;
  const donations = await scanDynamoDB("Donation_History", "Donor_email = :email", { ":email": donor_email });
  const donor = await scanDynamoDB("Donors", "email = :email", { ":email": donor_email });

  res.render("don_history", {
    name: donor[0].Donor_name,
    dataArr: { don_his_data: donations },
  });
});

app.get("/don_profile", async (req, res) => {
  const don_email = req.session.userEmail;
  const donor = await scanDynamoDB("Donors", "email = :email", { ":email": don_email });
  const donations = await scanDynamoDB("Donation_History", "Donor_email = :email", { ":email": don_email });

  res.render("don_profile", { don_data: donor[0], no_donations: donations.length });
});

app.get("/org_profile", async (req, res) => {
  const org_email = req.session.orgEmail;
  const org = await scanDynamoDB("Organizations", "email = :email", { ":email": org_email });
  const donations = await scanDynamoDB("Donation_History", "org_email = :email", { ":email": org_email });

  res.render("org_profile", { org_data: org[0], no_donations: donations.length });
});

app.get("/don_home", async (req, res) => {
  const don_email = req.session.userEmail;
  const donor = await scanDynamoDB("Donors", "email = :email", { ":email": don_email });

  res.render("don_home", { name: donor[0].Donor_name });
});

app.get("/org_home", async (req, res) => {
  const org_email = req.session.orgEmail;
  const org = await scanDynamoDB("Organizations", "email = :email", { ":email": org_email });
  const donations = await scanDynamoDB(
    "Donation_History",
    "org_email = :email AND #status = :status", // Use #status for reserved keyword
    { ":email": org_email, ":status": "Pending" },
    { "#status": "Status" } // Map #status to the actual attribute name
  );

  res.render("org_home", {
    name: org[0].organization_name,
    dataArr: { org_his_data: donations },
  });
});

app.post("/donation_accept", async (req, res) => {
  const orderID = req.body.orderid;
  const time = req.body.time;

  await updateItemInDynamoDB(
    "Donation_History",
    { OrderId: orderID },
    "SET Status = :status, time = :time",
    { ":status": "Accepted", ":time": time }
  );

  res.redirect("/org_home");
});

app.get("/org_history", async (req, res) => {
  const org_email = req.session.orgEmail;
  const donations = await scanDynamoDB(
    "Donation_History",
    "org_email = :email AND #status <> :status", // Use #status for reserved keyword
    { ":email": org_email, ":status": "Pending" }, // Include :email in ExpressionAttributeValues
    { "#status": "Status" } // Map #status to the actual attribute name
  );
  const org = await scanDynamoDB("Organizations", "email = :email", { ":email": org_email });

  res.render("org_history", {
    name: org[0].organization_name,
    dataArr: { org_his_data: donations },
  });
});

app.post("/donation_collect", async (req, res) => {
  const orderID = req.body.orderid;

  await updateItemInDynamoDB(
    "Donation_History",
    { OrderId: orderID },
    "SET Status = :status",
    { ":status": "Collected" }
  );

  res.redirect("/org_home");
});

app.get("/logout", (req, res) => {
  req.session.destroy();
  res.render("intro");
});

app.listen(3000, () => {
  console.log("Server runs on port 3000");
});