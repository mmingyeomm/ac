const express = require('express');
const bodyParser = require('body-parser');
const { exec } = require('child_process');
const path = require('path');
const fs = require('fs');
const cors = require('cors');

const app = express();
const PORT = process.env.PORT || 3002;

// Enable CORS for client requests
app.use(cors());

// Middleware to parse JSON bodies
app.use(bodyParser.json());

// Root endpoint
app.get('/', (req, res) => {
  res.send('AC Deployment Server is running!');
});

// Endpoint to handle deployment requests
app.post('/deploy', (req, res) => {
  console.log('Received deploy request:', req.body);
  
  // Check if request contains contract_code as used in interact.ts
  if (!req.body.contract_code) {
    return res.status(400).json({ error: 'No contract_code provided in request' });
  }

  const contractCode = req.body.contract_code;
  
  // Path to the lib.rs file
  const libRsPath = path.join(path.resolve(__dirname, '..'), 'programs', 'ac', 'src', 'lib.rs');
  
  // Write the contract code to lib.rs
  console.log('Writing contract code to:', libRsPath);
  try {
    fs.writeFileSync(libRsPath, contractCode);
    console.log('Successfully wrote contract code to lib.rs');
  } catch (writeError) {
    console.error('Error writing contract code to lib.rs:', writeError);
    return res.status(500).json({ 
      error: 'Failed to write contract code to lib.rs', 
      details: writeError.message 
    });
  }
  
  // Execute anchor deploy command
  const anchorPath = path.resolve(__dirname, '..');
  
  console.log('Executing anchor deploy command in directory:', anchorPath);
  
  // Execute the sequence of commands in the parent directory where Anchor.toml is located
  console.log('Step 1: Removing existing keypair if it exists...');
  exec('rm -f ./target/deploy/ac-keypair.json', 
    { cwd: anchorPath }, 
    (rmError, rmStdout, rmStderr) => {
      if (rmError) {
        console.warn('Warning during keypair removal:', rmError);
        // Continue despite error - file might not exist
      }
      
      console.log('Step 2: Building the program...');
      exec('anchor build', 
        { cwd: anchorPath }, 
        (buildError, buildStdout, buildStderr) => {
          if (buildError) {
            console.error('Error during build:', buildError);
            return res.status(500).json({ 
              error: 'Build failed', 
              details: buildError.message,
              stderr: buildStderr 
            });
          }
          
          console.log('Build successful. Step 3: Deploying the program...');
          exec('anchor deploy --provider.cluster devnet', 
            { cwd: anchorPath }, 
            (deployError, deployStdout, deployStderr) => {
              if (deployError) {
                console.error('Error during deployment:', deployError);
                return res.status(500).json({ 
                  error: 'Deployment failed', 
                  details: deployError.message,
                  stderr: deployStderr 
                });
              }
              
              console.log('Deployment successful:', deployStdout);
              
              // Extract program ID from output or use a dummy one if not found
              let contractAddress = "";
              
              try {
                // Attempt to extract the Program Id from stdout - updated regex to match the actual output
                const programIdMatch = deployStdout.match(/Program Id: ([a-zA-Z0-9]{32,44})/);
                if (programIdMatch && programIdMatch[1]) {
                  contractAddress = programIdMatch[1];
                  console.log("Found Program Id in output:", contractAddress);
                } else {
                  console.log("Could not find Program Id in output, searching alternative locations...");
                  console.log("Full stdout:", deployStdout);
                  
                  // Try another pattern that might appear in the output
                  const altMatch = deployStdout.match(/Program ID: ([a-zA-Z0-9]{32,44})/i);
                  if (altMatch && altMatch[1]) {
                    contractAddress = altMatch[1];
                    console.log("Found Program ID with alternate pattern:", contractAddress);
                  } else {
                    // If we can't find it in the output, try to read it from the IDL file
                    const idlPath = path.join(anchorPath, 'target', 'idl', 'ac.json');
                    if (fs.existsSync(idlPath)) {
                      const idlData = JSON.parse(fs.readFileSync(idlPath, 'utf8'));
                      contractAddress = idlData.metadata?.address || "";
                      console.log("Found Program ID in IDL file:", contractAddress);
                    }
                  }
                }
              } catch (err) {
                console.error('Error extracting contract address:', err);
              }
              
              // If we still don't have an address, provide a message
              if (!contractAddress) {
                contractAddress = "Address not found in output - check logs for details";
              }
              
              res.status(200).json({ 
                success: true, 
                message: 'Contract deployed successfully',
                output: deployStdout,
                contract_address: contractAddress
              });
            }
          );
        }
      );
    }
  );
});

// Start the server
app.listen(PORT, () => {
  console.log(`Server running on port ${PORT}`);
  console.log(`Deploy endpoint: http://localhost:${PORT}/deploy`);
});